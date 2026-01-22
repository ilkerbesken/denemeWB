/**
 * PWA Update Manager
 * Handles Service Worker registration and update notifications
 */
function initPWAUpdates() {
    console.log('PWA: Initializing update manager...');

    if ('serviceWorker' in navigator) {
        let newWorker;
        const toast = document.getElementById('updateToast');
        const btnUpdate = document.getElementById('btnUpdateNow');
        const btnLater = document.getElementById('btnUpdateLater');

        if (!toast || !btnUpdate || !btnLater) {
            console.warn('PWA: Update toast elements not found!');
            return;
        }

        function hideToast() {
            console.log('PWA: Hiding update toast');
            toast.classList.remove('show');
        }

        function handleUpdate(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            console.log('PWA: Update button clicked. worker ready?', !!newWorker);
            if (newWorker) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
            } else {
                console.warn('PWA: No new worker found to skip waiting');
                // If no worker but toast is shown, maybe it's a stale state, just hide it
                hideToast();
            }
        }

        function handleLater(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            console.log('PWA: Later button clicked');
            hideToast();
        }

        // Use pointerdown for immediate response, but track if we already handled it
        let handled = false;
        const wrapHandler = (fn) => (e) => {
            if (handled) return;
            handled = true;
            fn(e);
            setTimeout(() => { handled = false; }, 500);
        };

        // Attach events
        btnUpdate.addEventListener('pointerdown', wrapHandler(handleUpdate));
        btnUpdate.addEventListener('click', wrapHandler(handleUpdate));

        btnLater.addEventListener('pointerdown', wrapHandler(handleLater));
        btnLater.addEventListener('click', wrapHandler(handleLater));

        function showUpdateToast() {
            console.log('PWA: Showing update toast');
            toast.classList.add('show');
        }

        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('PWA: Service Worker registered');

            // Check if there is already a waiting worker
            if (reg.waiting) {
                console.log('PWA: Found waiting worker');
                newWorker = reg.waiting;
                showUpdateToast();
            }

            reg.addEventListener('updatefound', () => {
                console.log('PWA: New update found, installing...');
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    console.log('PWA: Worker state changed to:', newWorker.state);
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('PWA: Update fully installed and ready');
                        showUpdateToast();
                    }
                });
            });

            // Periodic check for updates (every hour)
            setInterval(() => {
                console.log('PWA: Checking for updates...');
                reg.update();
            }, 1000 * 60 * 60);

            window.addEventListener('focus', () => {
                reg.update();
            });
        }).catch(err => {
            console.error('PWA: Service Worker registration failed:', err);
        });

        // Reload when the new service worker takes over
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            console.log('PWA: Controller changed, reloading page...');
            window.location.reload();
            refreshing = true;
        });
    } else {
        console.log('PWA: Service workers not supported');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWAUpdates);
} else {
    initPWAUpdates();
}
