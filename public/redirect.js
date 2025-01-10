console.log("Redirect page loaded");
const params = new URLSearchParams(window.location.search);
const type = params.get('type');
const originalUrl = params.get('url');
console.log("URL parameters:", { type, originalUrl });

const container = document.getElementById('container');
const message = document.getElementById('message');
const subMessage = document.getElementById('subMessage');
const continueBtn = document.getElementById('continueBtn');
console.log("Elements retrieved:", { container, message, subMessage, continueBtn });

if (type === 'fun') {
  console.log("Setting up fun mode");
  container.classList.add('fun-bg');
  message.textContent = 'STOP!';
  subMessage.textContent = 'This is a Fun Website';
  continueBtn.style.color = '#8b5cf6';
} else if (type === 'funAndWork') {
  console.log("Setting up fun & work mode");
  container.classList.add('work-bg');
  message.textContent = 'WAIT!';
  subMessage.textContent = 'This is a Fun & Work Website';
  continueBtn.style.color = '#14b8a6';
}

continueBtn.textContent = 'Continue to Website';
continueBtn.onclick = () => {
  console.log("Continue button clicked");
  if (originalUrl) {
    console.log("Redirecting to:", originalUrl);
    window.location.href = originalUrl;
  }
};
console.log("Redirect page setup complete"); 