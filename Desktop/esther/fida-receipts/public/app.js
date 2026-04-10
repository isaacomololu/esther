// FIDA Receipts — single-page flow controller.
//
// Steps:
//   lookup   -> ask for email
//   existing -> show found member, collect matric + level
//   register -> full registration form (if email not found)
//   confirm  -> show payment summary and ask for confirmation
//   receipt  -> final receipt

const STEPS = ['lookup', 'existing', 'register', 'confirm', 'receipt'];
const state = {
  email: '',
  member: null,   // from lookup
  matric_no: '',
  level: '',
  amountPreview: '1500',
  eventName: 'FIDA Dues',
};

function show(step) {
  for (const s of STEPS) {
    document.getElementById('step-' + s).hidden = s !== step;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setError(id, message) {
  const el = document.getElementById(id);
  if (!message) {
    el.hidden = true;
    el.textContent = '';
  } else {
    el.textContent = message;
    el.hidden = false;
  }
}

async function apiGet(path) {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Request failed');
  return body.data;
}

async function apiPost(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Request failed');
  return body.data;
}

function formatCurrency(amount, currency) {
  const n = Number(amount);
  if (isNaN(n)) return `${currency || ''} ${amount}`;
  const symbol = currency === 'NGN' ? '₦' : `${currency} `;
  return `${symbol}${n.toLocaleString()}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------- Lookup ----------------
document.getElementById('lookup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setError('lookup-error', '');
  const email = document.getElementById('email').value.trim().toLowerCase();
  if (!email) return;
  state.email = email;
  const btn = e.submitter;
  btn.disabled = true;
  btn.textContent = 'Looking up…';
  try {
    const member = await apiGet('/api/attendees/lookup?email=' + encodeURIComponent(email));
    state.member = member;
    document.getElementById('existing-name').textContent = member.name;
    document.getElementById('ex-name').value = member.name;
    document.getElementById('ex-email').value = member.email;
    document.getElementById('ex-matric').value = member.matric_no || '';
    document.getElementById('ex-level').value = member.level || '';
    show('existing');
  } catch (err) {
    // 404 -> fall through to registration form, prefilled with the email.
    if (/no member/i.test(err.message)) {
      document.getElementById('reg-email').value = email;
      show('register');
    } else {
      setError('lookup-error', err.message);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Continue';
  }
});

// ---------------- Existing-member form ----------------
document.getElementById('existing-form').addEventListener('submit', (e) => {
  e.preventDefault();
  state.matric_no = document.getElementById('ex-matric').value.trim();
  state.level = document.getElementById('ex-level').value.trim();
  if (!state.matric_no || !state.level) return;
  renderConfirm({
    name: state.member.name,
    matric_no: state.matric_no,
    level: state.level,
  });
  show('confirm');
});

// ---------------- Registration form ----------------
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  btn.disabled = true;
  btn.textContent = 'Registering…';
  try {
    const payload = {
      name: document.getElementById('reg-name').value.trim(),
      email: document.getElementById('reg-email').value.trim().toLowerCase(),
      phone: document.getElementById('reg-phone').value.trim(),
      matric_no: document.getElementById('reg-matric').value.trim(),
      level: document.getElementById('reg-level').value.trim(),
    };
    const member = await apiPost('/api/attendees', payload);
    state.email = member.email;
    state.member = member;
    state.matric_no = payload.matric_no;
    state.level = payload.level;
    renderConfirm({
      name: member.name,
      matric_no: payload.matric_no,
      level: payload.level,
    });
    show('confirm');
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Register & continue';
  }
});

// ---------------- Confirmation ----------------
function renderConfirm({ name, matric_no, level }) {
  document.getElementById('sum-name').textContent = name;
  document.getElementById('sum-matric').textContent = matric_no;
  document.getElementById('sum-level').textContent = level;
  document.getElementById('sum-event').textContent = state.eventName;
  document.getElementById('sum-amount').textContent = state.amountPreview;
  setError('confirm-error', '');
}

document.getElementById('confirm-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = 'Processing…';
  setError('confirm-error', '');
  try {
    const receipt = await apiPost('/api/payments', {
      email: state.email,
      matric_no: state.matric_no,
      level: state.level,
    });
    renderReceipt(receipt);
    show('receipt');
  } catch (err) {
    setError('confirm-error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Payment';
  }
});

// ---------------- Receipt ----------------
function renderReceipt(r) {
  document.getElementById('r-no').textContent = r.receipt_no;
  document.getElementById('r-name').textContent = r.name;
  document.getElementById('r-matric').textContent = r.matric_no;
  document.getElementById('r-level').textContent = r.level;
  document.getElementById('r-amount').textContent = formatCurrency(r.amount, r.currency);
  document.getElementById('r-date').textContent = formatDate(r.date);
  document.getElementById('r-event').textContent = r.event_name;
  document.getElementById('r-received').textContent =
    `${r.received_by_name} (${r.received_by_title})`;
  // Update the confirm-step preview for future attendees on the same device.
  state.amountPreview = formatCurrency(r.amount, r.currency);
  state.eventName = r.event_name;
}

// ---------------- Back buttons ----------------
document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-back');
    if (target === 'lookup') {
      document.getElementById('lookup-form').reset();
      document.getElementById('existing-form').reset();
      document.getElementById('register-form').reset();
      state.email = '';
      state.member = null;
      state.matric_no = '';
      state.level = '';
    }
    show(target);
  });
});

// ---------------- Init ----------------
show('lookup');
