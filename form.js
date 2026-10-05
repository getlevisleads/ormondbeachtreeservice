// Logs taps on Call (tel:) and Text (sms:) links to /api/click, so phone leads can be counted.
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="sms:"]');
  if (!a || !navigator.sendBeacon) return;
  var data = new FormData();
  data.append('type', a.getAttribute('href').indexOf('sms:') === 0 ? 'text' : 'call');
  data.append('page', location.pathname);
  var ref = '';
  try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (err) {}
  data.append('source', ref === location.hostname ? '' : ref);
  navigator.sendBeacon('/api/click', data);
});

// Sends the quote form to the Pages Function at /api/lead.
document.getElementById('lead-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  var form = this;
  var msg = document.getElementById('form-msg');
  var btn = form.querySelector('button[type="submit"]');
  msg.hidden = false;
  if (!form.checkValidity()) {
    msg.textContent = 'Please fill in your name, email and phone so a tree pro can reach you.';
    return;
  }
  btn.disabled = true;
  msg.textContent = 'Sending...';
  try {
    var res = await fetch(form.action, { method: 'POST', body: new FormData(form) });
    var out = await res.json().catch(function () { return {}; });
    if (res.ok && out.ok) {
      form.reset();
      msg.textContent = 'Thanks! Your request was sent. A local tree pro will reach out soon.';
    } else {
      msg.textContent = out.error || 'Something went wrong. Please call or text (386) 242-8812.';
    }
  } catch (err) {
    msg.textContent = 'Something went wrong. Please call or text (386) 242-8812.';
  }
  btn.disabled = false;
});
