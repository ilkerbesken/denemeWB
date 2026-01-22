/**
 * PWA Update Manager
 * Handles Service Worker registration and update notifications
 */
function initPWAUpdates() {
    if ('serviceWorker' in navigator) {
        let newWorker;
        const toast = document.getElementById('updateToast');
        const btnUpdate = document.getElementById('btnUpdateNow');
        const btnLater = document.getElementById('btnUpdateLater');

        if (!toast || !btnUpdate || !btnLater) return;

        function hideToast() {
            toast.classList.remove('show');
        }

        function handleUpdate() {
            if (newWorker) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
            hideToast();
        }

        // Setup listeners once
        btnUpdate.addEventListener('click', handleUpdate);
        btnUpdate.addEventListener('pointerdown', (e) => {
            // Ensure touch feedback is fast but don't double-trigger if click also fires
            if (e.pointerType === 'touch') handleUpdate();
        });

        btnLater.addEventListener('click', hideToast);
        btnLater.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') hideToast();
        });

        function showUpdateToast() {
            if (toast) toast.classList.add('show');
        }

        navigator.serviceWorker.register('./sw.js').then(reg => {
            // Check if there is already a waiting worker
            if (reg.waiting) {
                newWorker = reg.waiting;
                showUpdateToast();
            }

            reg.addEventListener('updatefound', () => {
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateToast();
                    }
                });
            });

            // Periodic check for updates (every hour)
            setInterval(() => {
                reg.update();
            }, 1000 * 60 * 60);

            window.addEventListener('focus', () => {
                reg.update();
            });
        });

        // Reload when the new service worker takes over
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWAUpdates);
} else {
    initPWAUpdates();
}
