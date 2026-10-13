'use strict';

const menuButton = document.querySelector('#menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
function closeMenu(returnFocus = false) {
  mobileMenu.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open menu');
  if (returnFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  mobileMenu.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
mobileMenu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileMenu.hidden) closeMenu(true); });
document.addEventListener('click', event => { if (!event.target.closest('header')) closeMenu(); });
matchMedia('(min-width: 1024px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const tabs = [...document.querySelectorAll('[role="tab"]')];
const handoff = document.querySelector('#form-handoff');
function selectAudience(audience, focus = false) {
  tabs.forEach(tab => {
    const selected = tab.id === 'tab-' + audience;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    if (selected && focus) tab.focus();
  });
  handoff.hidden = true;
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectAudience(tab.id.replace('tab-', '')));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectAudience(tabs[next].id.replace('tab-', ''), true);
  });
});
document.querySelectorAll('[data-audience]').forEach(link => link.addEventListener('click', () => selectAudience(link.dataset.audience)));

const cv = document.querySelector('#learner-cv');
function validateCV() {
  const file = cv.files[0];
  cv.setCustomValidity('');
  const status = document.querySelector('#cv-status');
  status.textContent = '';
  if (!file) return;
  if (!/\.(pdf|doc|docx)$/i.test(file.name)) cv.setCustomValidity('Choose a PDF, DOC or DOCX file.');
  else if (file.size > 5 * 1024 * 1024) cv.setCustomValidity('Your CV is larger than 5 MB. Please choose a smaller file.');
  else if (file.size === 0) cv.setCustomValidity('This file is empty. Please choose your CV again.');
  status.textContent = cv.validationMessage || `${file.name} selected (${Math.max(1, Math.round(file.size / 1024))} KB). Attach it when you send your message.`;
}
cv.addEventListener('change', validateCV);

// Message composition/handoff adapted from FitnessIcon/js/enquiry.js.
// This direct-contact route never claims to have sent or uploaded a submission.
const labels = { name: 'Name', company: 'Company', email: 'Email', phone: 'Phone / WhatsApp', location: 'Town / city', education: 'Education', message: 'Message', unemployed: 'Currently unemployed', consent: 'Consent' };
document.querySelectorAll('form[data-enquiry]').forEach(form => {
  form.querySelector('[type="submit"]').disabled = false;
  // Without JS the forms are a direct-contact notice, never a GET containing personal data.
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (form.dataset.enquiry === 'learner') validateCV();
    form.querySelectorAll('[data-field-error]').forEach(el => el.remove());
    const summary = form.querySelector('[data-error-summary]');
    summary.replaceChildren();
    const fields = [...form.querySelectorAll('input,select,textarea')];
    const invalid = [];
    fields.forEach((field, index) => {
      if (!field.id) field.id = form.id + '-field-' + index;
      field.removeAttribute('aria-invalid');
      const describedBy = (field.getAttribute('aria-describedby') || '').split(' ').filter(id => id && !id.endsWith('-error'));
      if (describedBy.length) field.setAttribute('aria-describedby', describedBy.join(' ')); else field.removeAttribute('aria-describedby');
      if (field.checkValidity()) return;
      invalid.push(field);
      field.setAttribute('aria-invalid', 'true');
      const error = document.createElement('p');
      error.id = field.id + '-error';
      error.dataset.fieldError = '';
      error.className = 'error-text';
      error.textContent = field.type === 'checkbox' ? 'Please confirm this before continuing.' : field.validationMessage;
      field.setAttribute('aria-describedby', [...describedBy, error.id].join(' '));
      const container = field.closest('.check-row') || field.parentElement;
      if (field.type === 'checkbox') container.insertAdjacentElement('afterend', error); else container.append(error);
    });
    summary.hidden = invalid.length === 0;
    if (invalid.length) {
      const title = document.createElement('p');
      title.className = 'font-semibold';
      title.textContent = 'Please check the following fields:';
      summary.append(title);
      const list = document.createElement('ul');
      invalid.forEach(field => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#' + field.id;
        link.className = 'inline-flex min-h-11 items-center underline';
        link.textContent = field.name === 'cv' ? 'Your CV' : labels[field.name] || field.name;
        link.addEventListener('click', event => { event.preventDefault(); field.focus(); });
        item.append(link); list.append(item);
      });
      summary.append(list); summary.focus(); handoff.hidden = true; return;
    }
    const title = form.dataset.enquiry === 'company' ? 'Company enquiry' : 'Learner expression of interest';
    const lines = [title + ' — The Aptitude Academy', ''];
    new FormData(form).forEach((value, key) => {
      if (value instanceof File) { if (value.name) lines.push('CV selected: ' + value.name + ' (attach this file before sending)'); }
      else lines.push((labels[key] || key) + ': ' + (value === 'on' ? 'Yes' : value.trim()));
    });
    const text = lines.join('\n');
    document.querySelector('#handoff-message').value = text;
    document.querySelector('#handoff-whatsapp').href = 'https://wa.me/27818058686?text=' + encodeURIComponent(text);
    document.querySelector('#handoff-email').href = 'mailto:admin@theaptitudeacademy.co.za?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(text);
    document.querySelector('#handoff-guidance').textContent = form.dataset.enquiry === 'learner'
      ? 'Choose email or WhatsApp to send your details. Attach your CV in that app before sending.'
      : 'Choose email or WhatsApp to send your details to The Aptitude Academy.';
    document.querySelector('#copy-status').textContent = '';
    handoff.hidden = false;
    handoff.focus();
  });
  // Clear stale handoff details if the form changes, preserving entered data across tabs.
  form.addEventListener('input', () => { handoff.hidden = true; });
});
document.querySelector('#copy-message').addEventListener('click', async () => {
  const field = document.querySelector('#handoff-message');
  try { await navigator.clipboard.writeText(field.value); document.querySelector('#copy-status').textContent = 'Message copied. Attach your CV separately if you are enquiring as a learner.'; }
  catch { field.focus(); field.select(); document.querySelector('#copy-status').textContent = 'Select and copy the message above.'; }
});

const dialog = document.querySelector('#policy-dialog');
document.querySelectorAll('[data-policy]').forEach(button => button.addEventListener('click', () => {
  const privacy = button.dataset.policy === 'privacy';
  document.querySelector('#policy-title').textContent = privacy ? 'Privacy notice' : 'Cookie notice';
  const paragraphs = privacy ? [
    'The Aptitude Academy uses the information you choose to send to answer company enquiries and consider learner interest in suitable opportunities. A learner message may include contact details, location, education and a CV. Sending an enquiry does not guarantee placement.',
    'This page prepares your message in your browser. It does not send or store the form details or your CV on the website. You choose whether to send the message through your email or WhatsApp app, and attach your CV there. That service handles your message under its own privacy terms.',
    'After you send a message, The Aptitude Academy receives it and is responsible for how it uses, shares and retains your information. To ask about your information or request a correction or deletion, contact admin@theaptitudeacademy.co.za.'
  ] : [
    'This public website does not set analytics or advertising cookies. The contact options may open email or WhatsApp; those services have their own privacy and cookie practices.'
  ];
  document.querySelector('#policy-content').replaceChildren(...paragraphs.map(value => {
    const paragraph = document.createElement('p');
    paragraph.textContent = value;
    return paragraph;
  }));
  dialog.showModal();
}));
document.querySelector('#close-policy').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
