export function scrollAndHighlightItem(itemId) {
    const target = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('omni-highlighted');

    window.setTimeout(() => {
        target.classList.remove('omni-highlighted');
    }, 1000);
}
