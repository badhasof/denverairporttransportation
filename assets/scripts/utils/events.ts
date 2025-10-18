/**
 * Registers a delegate event handler on the specified element or document.
 *
 * @param {HTMLElement | Document} $element - The element or document to attach the event handler to.
 * @param {string} eventType - The type of event to listen for (e.g., 'click', 'keydown', etc.).
 * @param {string} selector - The CSS selector for the target elements within the $element.
 * @param {Function} handler - The event handler function to be executed when the event occurs.
 * @param {Object} [options] - An options object that specifies characteristics about the event listener.
 * @param {boolean} [options.capture=false] - A Boolean indicating that events of this type will be dispatched to the registered listener before being dispatched to any EventTarget beneath it in the DOM tree.
 * @param {AbortSignal} [options.signal] - An AbortSignal object instance; allows you to communicate with a DOM request (such as a Fetch) and abort it if required via an AbortController object.
 * @returns {AbortController} - An AbortController object instance.
 */
const delegateEvent = ($element, eventType, selector, handler, options = null) => {
    options = typeof options === 'boolean' ? { capture: options } : { ...options };

    let controller;
    if (options.signal == null) {
        controller = new AbortController();
        options.signal = controller.signal;
    }

    $element.addEventListener(
        eventType,
        (event) => event.target.matches(selector) && handler(event),
        options
    );

    return controller;
};

export { delegateEvent };
