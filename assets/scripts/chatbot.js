/**
 * Lightship AI Chatbot
 * Minimal, elegant chatbot that matches the Lightship aesthetic
 */

class LightshipChatbot {
  constructor(config = {}) {
    this.isOpen = false;
    this.messages = [];
    this.isLoading = false;
    this.init();
  }

  init() {
    this.createDOM();
    this.attachEventListeners();
    this.animateIn();
  }

  createDOM() {
    // Main container
    const chatContainer = document.createElement('div');
    chatContainer.className = 'c-chatbot';
    chatContainer.innerHTML = `
      <div class="c-chatbot_widget">
        <!-- Chat window -->
        <div class="c-chatbot_window">
          <div class="c-chatbot_header">
            <h3 class="c-chatbot_title">Chat with us</h3>
            <button class="c-chatbot_close" aria-label="Close chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="c-chatbot_messages">
            <div class="c-chatbot_message -bot">
              <div class="c-chatbot_message_content">
                <p>Hey there! How can we help you with your Lightship journey?</p>
              </div>
            </div>
          </div>

          <div class="c-chatbot_input_wrapper">
            <input
              type="text"
              class="c-chatbot_input"
              placeholder="Ask us anything..."
              aria-label="Message input"
            >
            <button class="c-chatbot_send" aria-label="Send message">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16151496 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.98722579 L3.03521743,10.4282188 C3.03521743,10.5853162 3.19218622,10.7424135 3.50612381,10.7424135 L16.6915026,11.5279004 C16.6915026,11.5279004 17.1624089,11.5279004 17.1624089,12.0003048 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Toggle button -->
        <button class="c-chatbot_toggle" aria-label="Open chat">
          <span class="c-chatbot_toggle_icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
          </span>
        </button>
      </div>
    `;

    document.body.appendChild(chatContainer);
    this.container = chatContainer;
    this.window = chatContainer.querySelector('.c-chatbot_window');
    this.messagesContainer = chatContainer.querySelector('.c-chatbot_messages');
    this.input = chatContainer.querySelector('.c-chatbot_input');
    this.sendBtn = chatContainer.querySelector('.c-chatbot_send');
    this.toggleBtn = chatContainer.querySelector('.c-chatbot_toggle');
    this.closeBtn = chatContainer.querySelector('.c-chatbot_close');
  }

  attachEventListeners() {
    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.closeBtn.addEventListener('click', () => this.close());
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.container.classList.add('is-open');
    this.input.focus();
    this.animateOpen();
  }

  close() {
    this.isOpen = false;
    this.container.classList.remove('is-open');
    this.animateClose();
  }

  async sendMessage() {
    const text = this.input.value.trim();
    if (!text || this.isLoading) return;

    this.input.value = '';
    this.isLoading = true;

    // Add user message
    this.addMessage(text, 'user');

    // Fade input
    this.input.style.opacity = '0.5';

    // Random demo responses
    const demoResponses = [
      "That's a great question! Our AE.1 platform offers cutting-edge electric technology for your RV adventures.",
      "You can customize your Lightship with our Make It Yours program - choose your interior finishes, tech packages, and more!",
      "The Atmos and Panos models are both available to order. Which one interests you most?",
      "Our solar integration system can keep you powered off-grid for extended adventures.",
      "We offer comprehensive warranties and support to ensure your Lightship experience is seamless.",
      "The battery system in our trailers provides excellent range and reliability for your travels.",
      "Ready to start your electric RV journey? Let me know how I can help!",
      "Lightship brings together smart power and streamlined design for the modern traveler.",
    ];

    // Simulate API delay
    setTimeout(() => {
      const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];
      this.addMessage(randomResponse, 'bot');
      this.isLoading = false;
      this.input.style.opacity = '1';
    }, 800);
  }

  addMessage(text, sender) {
    const messageEl = document.createElement('div');
    messageEl.className = `c-chatbot_message -${sender}`;
    messageEl.innerHTML = `
      <div class="c-chatbot_message_content">
        <p>${this.escapeHtml(text)}</p>
      </div>
    `;

    this.messagesContainer.appendChild(messageEl);

    // Animate message in with CSS
    messageEl.style.animation = 'slideIn 0.3s ease forwards';

    // Auto scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  animateIn() {
    this.toggleBtn.style.animation = 'popIn 0.5s ease-out 0.5s forwards';
  }

  animateOpen() {
    this.toggleBtn.style.animation = 'fadeOut 0.3s ease forwards';
    this.window.style.animation = 'slideInUp 0.4s ease forwards';
  }

  animateClose() {
    this.window.style.animation = 'slideOutDown 0.3s ease forwards';
    setTimeout(() => {
      this.toggleBtn.style.animation = 'popIn 0.3s ease forwards';
    }, 100);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new LightshipChatbot();
});
