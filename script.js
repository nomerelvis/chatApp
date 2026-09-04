// Sample data & UI wiring for the chat UI
const users = [
  {
    id: 'u1', name: 'Ava Stone', lastSeen: '2m ago', online: true,
    preview: 'Hey — did you see the latest design?', lastTime:'11:34 AM', unread: 2, read: true,
    messages:[
      {id:1, from:'them', text:'Hey — did you see the latest design?', time:'11:30 AM'},
      {id:2, from:'me', text:'Yep, looks great! I tweaked spacing.', time:'11:34 AM', status:'read'}
    ]
  },
  {
    id: 'u2', name: 'Mason Lee', lastSeen: '1h ago', online: false,
    preview: 'I pushed the update to the branch.', lastTime:'10:02 AM', unread:0, read:true,
    messages:[
      {id:1, from:'them', text:'I pushed the update to the branch.', time:'10:02 AM'}
    ]
  },
  {
    id: 'u3', name: 'Noah Rivera', lastSeen: '5m ago', online: true,
    preview: 'On a call, brb', lastTime:'9:44 AM', unread:5, read:false,
    messages:[
      {id:1, from:'them', text:'On a call, brb', time:'9:44 AM'}
    ]
  },
  {
    id: 'u4', name: 'Zoe Patel', lastSeen: 'Yesterday', online: false,
    preview: 'Thanks — that worked.', lastTime:'Mon', unread:0, read:true,
    messages:[
      {id:1, from:'them', text:'Thanks — that worked.', time:'Mon'}
    ]
  }
];

// caching DOM
const usersList = document.getElementById('usersList');
const searchInput = document.getElementById('searchInput');
const messagesWrap = document.getElementById('messages');
const contactName = document.getElementById('contactName');
const contactPresence = document.getElementById('contactPresence');
const chatAvatar = document.getElementById('chatAvatar');
const messageInput = document.getElementById('messageInput');
const fileInput = document.getElementById('fileInput');
const emojiBtn = document.getElementById('emojiBtn');
const micBtn = document.getElementById('micBtn');

let activeUserId = null;

// helpers
function initials(name){
  return name.split(' ').map(n=>n[0]).slice(0,2).join('');
}

function renderUsers(list){
  usersList.innerHTML = '';
  list.forEach(u=>{
    const li = document.createElement('li');
    li.className = 'user-row';
    li.dataset.id = u.id;

    // avatar
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = initials(u.name);

    const status = document.createElement('div');
    status.className = 'status-dot';
    status.style.backgroundColor = u.online ? 'var(--online)' : 'var(--offline)';
    status.title = u.online ? 'Online' : `Last seen: ${u.lastSeen}`;
    avatar.appendChild(status);

    // info
    const info = document.createElement('div');
    info.className = 'user-info';

    const top = document.createElement('div');
    top.className = 'user-top';

    const name = document.createElement('div');
    name.className = 'user-name';
    name.textContent = u.name;

    const time = document.createElement('div');
    time.className = 'user-time';
    time.textContent = u.lastTime;

    top.appendChild(name); top.appendChild(time);

    const bottom = document.createElement('div');
    bottom.className = 'user-bottom';

    const preview = document.createElement('div');
    preview.className = 'user-preview';
    preview.textContent = u.preview;

    bottom.appendChild(preview);

    if (u.unread && u.unread > 0){
      const badge = document.createElement('div');
      badge.className = 'unread-badge';
      badge.textContent = u.unread > 99 ? '99+' : u.unread;
      bottom.appendChild(badge);
    } else {
      // read receipt small icon on right if last was sent by me and read
      if (u.read){
        const tick = document.createElement('div');
        tick.className = 'msg-tick';
        tick.style.color = 'var(--muted)';
        tick.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M21 7L9 19l-5.5-5.5L5 12l4 4L19 6z"/></svg>';
        bottom.appendChild(tick);
      }
    }

    info.appendChild(top); info.appendChild(bottom);

    li.appendChild(avatar);
    li.appendChild(info);

    li.addEventListener('click', ()=>{
      document.querySelectorAll('.user-row').forEach(r=>r.classList.remove('active'));
      li.classList.add('active');
      openChat(u.id);
    });

    usersList.appendChild(li);
  });
}

function openChat(userId){
  activeUserId = userId;
  const user = users.find(u=>u.id === userId);
  contactName.textContent = user.name;
  contactPresence.textContent = user.online ? 'Online' : `Last seen ${user.lastSeen}`;
  chatAvatar.textContent = initials(user.name);

  // render messages
  messagesWrap.innerHTML = '';
  user.messages.forEach(m=>{
    appendMessageToDOM(m);
  });

  // auto scroll
  scrollToBottom();
}

function appendMessageToDOM(message){
  const row = document.createElement('div');
  row.className = 'msg-row ' + (message.from === 'me' ? 'sent' : 'received');

  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + (message.from === 'me' ? 'sent' : 'received');
  bubble.textContent = message.text;

  // meta container
  const meta = document.createElement('div');
  meta.className = 'msg-meta';

  const time = document.createElement('div');
  time.textContent = message.time;
  meta.appendChild(time);

  if (message.from === 'me'){
    const ticks = document.createElement('div');
    ticks.className = 'ticks';
    ticks.innerHTML = message.status === 'read' ? '<svg width="16" height="12" viewBox="0 0 24 24" fill="#1e88e5"><path d="M21 7L9 19l-5.5-5.5L5 12l4 4L19 6z"/></svg>' :
                      '<svg width="16" height="12" viewBox="0 0 24 24" fill="var(--muted)"><path d="M21 7L9 19l-5.5-5.5L5 12l4 4L19 6z"/></svg>';
    meta.appendChild(ticks);
  }

  bubble.appendChild(meta);
  row.appendChild(bubble);
  messagesWrap.appendChild(row);
}

function scrollToBottom(){
  messagesWrap.scrollTop = messagesWrap.scrollHeight;
}

// search filtering
searchInput.addEventListener('input', (e)=>{
  const q = e.target.value.trim().toLowerCase();
  const filtered = users.filter(u => u.name.toLowerCase().includes(q) || u.preview.toLowerCase().includes(q));
  renderUsers(filtered);
});

// sending message
messageInput.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' && activeUserId){
    const text = messageInput.value.trim();
    if (!text) return;
    const user = users.find(u=>u.id===activeUserId);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const msg = {id: Date.now(), from:'me', text, time: timeStr, status:'delivered'};
    user.messages.push(msg);
    appendMessageToDOM(msg);
    messageInput.value = '';
    scrollToBottom();

    // simulate read after a short delay
    setTimeout(()=>{
      msg.status = 'read';
      // re-render messages area for ticks update (simple approach)
      openChat(activeUserId);
    }, 900);
  }
});

// file/emoji/mic placeholders
fileInput.addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if (!f || !activeUserId) return;
  const user = users.find(u=>u.id===activeUserId);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const msg = {id: Date.now(), from:'me', text:`📎 ${f.name}`, time: timeStr, status:'delivered'};
  user.messages.push(msg);
  appendMessageToDOM(msg);
  scrollToBottom();
  fileInput.value = '';
});

emojiBtn.addEventListener('click', ()=>{
  // small emoji picker placeholder
  if (!activeUserId) return;
  messageInput.value = (messageInput.value || '') + ' 🙂';
  messageInput.focus();
});

micBtn.addEventListener('click', ()=>{
  // placeholder - you could integrate WebAudio / MediaRecorder here
  alert('Microphone recording placeholder. Integrate MediaRecorder for recording.');
});

// init
renderUsers(users);

// open first chat by default (optional)
if (users.length) openChat(users[0].id);