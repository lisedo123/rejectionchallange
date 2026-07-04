let state = { 
    goal: 100, 
    entries: [] 
};
let loaded = false;

async function loadState() {
    try {
        const res = await window.storage.get('rejection-log-state');
        if (res && res.value) {
            state = JSON.parse(res.value);
            if (!state.goal) state.goal = 100;
            if (!state.entries) state.entries = [];
        }
    } catch (e) {
        state = { goal: 100, entries: [] };
    }
    loaded = true;
    render();
}

async function saveState() {
    try {
        await window.storage.set('rejection-log-state', JSON.stringify(state));
    } catch (e) {
        console.error('Could not save', e);
    }
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'hrs ago';
    const days = Math.floor(hrs / 24);
    return days + 'days ago';
}

function render() {
    const total = state.entries.length;
    const rejected = state.entries.filter(e => e.outcome === 'rejected').length;
    const accepted = state.entries.filter(e => e.outcome === 'accepted').length;
    const pending = total - rejected - accepted;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statRejected').textContent = rejected;
    document.getElementById('statAccepted').textContent = accepted;
    document.getElementById('statPending').textContent = pending;

    const decided = rejected + accepted;
    document.getElementById('rejectRate').textContent = decided > 0
        ? Math.round((rejected / decided) * 100) + '% reject rate'
        : '— reject rate';

    const pct = Math.min(100, Math.round((total / state.goal) * 100));
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressCaption').textContent = total + ' of ' + state.goal + ' toward goal';

    document.querySelectorAll('#goalToggle button').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.goal) === state.goal);
    });

    const list = document.getElementById('entries');
    const empty = document.getElementById('emptyState');
    if (total === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    const sorted = [...state.entries].sort((a, b) => b.createdAt - a.createdAt);
    list.innerHTML = sorted.map(e => {
        const num = String(state.entries.findIndex(x => x.id === e.id) + 1).padStart(3, '0');
        let stampHtml = '';
        let hasStampClass = '';
        if (e.outcome === 'rejected') {
            stampHtml = '<div class="stamp rejected">Rejected</div>';
            hasStampClass = 'has-stamp';
        } else if (e.outcome === 'accepted') {
            stampHtml = '<div class="stamp accepted">Accepted</div>';
            hasStampClass = 'has-stamp';
        }
        const actionsHtml = e.outcome === 'pending'
            ? '<div class="outcome-btns">'
            + '<button class="reject-btn" onclick="setOutcome(\'' + e.id + '\',\'rejected\')">Got rejected</button>'
            + '<button class="accept-btn" onclick="setOutcome(\'' + e.id + '\',\'accepted\')">Got a yes</button>'
            + '</div>'
            : '<button class="delete-x" onclick="resetOutcome(\'' + e.id + '\')" aria-label="Reset outcome"><i class="ti ti-rotate"></i> redo</button>';

        return '<div class="entry ' + hasStampClass + '">'
            + stampHtml
            + '<div class="entry-num">FILE NO. ' + num + ' &middot; predicted ' + e.fear + '% odds of no</div>'
            + '<div class="entry-text">' + escapeHtml(e.text) + '</div>'
            + '<div class="entry-footer">'
            + '<span class="entry-meta">' + timeAgo(e.createdAt) + '</span>'
            + actionsHtml
            + '</div>'
            + '<button class="delete-x" style="position:absolute;top:8px;right:8px;" onclick="deleteEntry(\'' + e.id + '\')" aria-label="Delete entry"><i class="ti ti-x"></i></button>'
            + '</div>';
    }).join('');
}

window.setOutcome = function (id, outcome) {
    const e = state.entries.find(x => x.id === id);
    if (e) { 
        e.outcome = outcome; 
        saveState(); 
        render(); }
};
window.resetOutcome = function (id) {
    const e = state.entries.find(x => x.id === id);
    if (e) { 
        e.outcome = 'pending'; 
        saveState(); 
        render(); }
};
window.deleteEntry = function (id) {
    state.entries = state.entries.filter(x => x.id !== id);
    saveState(); 
    render();
};

document.getElementById('fearSlider').addEventListener('input', (e) => {
    document.getElementById('fearValue').textContent = e.target.value + '%';
});

document.getElementById('submitAsk').addEventListener('click', () => {
    const input = document.getElementById('askInput');
    const text = input.value.trim();
    if (!text) { 
        input.focus(); 
        return; 
    }
    const fear = document.getElementById('fearSlider').value;
    state.entries.push({
        id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        text,
        fear: parseInt(fear),
        outcome: 'pending',
        createdAt: Date.now()
    });
    input.value = '';
    document.getElementById('fearSlider').value = 70;
    document.getElementById('fearValue').textContent = '70%';
    saveState();
    render();
});

document.getElementById('askInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        document.getElementById('submitAsk').click();
    }
});

document.getElementById('goalToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    state.goal = parseInt(btn.dataset.goal);
    saveState();
    render();
});

loadState();