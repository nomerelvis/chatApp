const authView = document.getElementById('authView');
const authForm = document.getElementById('authForm');
const authName = document.getElementById('authName');
const authUsername = document.getElementById('authUsername');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authConfirm = document.getElementById('authConfirm');
const authMessage = document.getElementById('authMessage');
const authSubmit = document.getElementById('authSubmit');
const currentUserName = document.getElementById('currentUserName');
const logoutBtn = document.getElementById('logoutBtn');
const authModeButtons = document.querySelectorAll('[data-auth-mode]');
const siteHeader = document.querySelector('.site-header');
const viewContainer = document.querySelector('.view-container');
const passwordChangeToggle = document.getElementById('passwordChangeToggle');
const passwordChangeForm = document.getElementById('passwordChangeForm');
const changeEmail = document.getElementById('changeEmail');
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const newPasswordConfirm = document.getElementById('newPasswordConfirm');
const passwordChangeMessage = document.getElementById('passwordChangeMessage');
const SUPABASE_URL = 'https://ydwiyahutxccyzlqltqu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_h1aYxTKYoNbYonkwAD-FYg_U637czRi';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let authMode = 'signin';

function setAuthMessage(message, isError = true){
  authMessage.textContent = message;
  authMessage.classList.toggle('error', isError);
}

function updateAuthMode(nextMode){
  authMode = nextMode === 'signup' ? 'signup' : 'signin';
  const isSignup = authMode === 'signup';
  document.getElementById('authNameLabel').hidden = !isSignup;
  authName.hidden = !isSignup;
  authName.required = isSignup;
  document.getElementById('authUsernameLabel').hidden = !isSignup;
  authUsername.hidden = !isSignup;
  authUsername.required = isSignup;
  document.getElementById('authConfirmLabel').hidden = !isSignup;
  authConfirm.hidden = !isSignup;
  authConfirm.required = isSignup;
  authPassword.autocomplete = isSignup ? 'new-password' : 'current-password';
  authSubmit.textContent = isSignup ? 'Create account' : 'Enter workspace';
  authModeButtons.forEach(button => {
    const active = button.dataset.authMode === authMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  setAuthMessage('');
}

async function checkUsernameAvailability(username){
  const normalized = username.trim().toLowerCase();
  if (!normalized || normalized.length < 3){
    authUsername.setCustomValidity('Username must be at least 3 characters.');
    return false;
  }
  if (!/^[a-z0-9._-]+$/.test(normalized)){
    authUsername.setCustomValidity('Use only letters, numbers, dots, underscores, and dashes.');
    return false;
  }

  const {data, error} = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('username', normalized)
    .maybeSingle();

  if (error){
    setAuthMessage(error.message);
    authUsername.setCustomValidity(error.message);
    return false;
  }

  const taken = Boolean(data);
  authUsername.setCustomValidity(taken ? 'This username is already taken.' : '');
  if (taken){
    setAuthMessage('That username is already taken.', true);
    return false;
  }

  setAuthMessage('Username available.', false);
  return true;
}

function showWorkspace(account){
  currentUser = account;
  authView.hidden = true;
  siteHeader.hidden = false;
  viewContainer.hidden = false;
  const username = account.user_metadata?.username;
  const fullName = account.user_metadata?.full_name;
  currentUserName.textContent = username ? `@${username}` : (fullName || account.email);
  loadContacts();
}

function showAuth(){
  authView.hidden = false;
  siteHeader.hidden = true;
  viewContainer.hidden = true;
}

authModeButtons.forEach(button => button.addEventListener('click', () => updateAuthMode(button.dataset.authMode)));
authUsername.addEventListener('input', async () => {
  if (authMode !== 'signup') return;
  const username = authUsername.value.trim();
  if (!username) {
    setAuthMessage('');
    return;
  }
  await checkUsernameAvailability(username);
});

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = authName.value.trim();
  const username = authUsername.value.trim().toLowerCase();
  const email = authEmail.value.trim().toLowerCase();
  const password = authPassword.value;
  authSubmit.disabled = true;
  setAuthMessage('');

  if (authMode === 'signup'){
    if (!name){
      setAuthMessage('Enter your name to continue.');
      authName.focus();
      authSubmit.disabled = false;
      return;
    }
    if (!username){
      setAuthMessage('Choose a username to continue.');
      authUsername.focus();
      authSubmit.disabled = false;
      return;
    }
    const usernameAvailable = await checkUsernameAvailability(username);
    if (!usernameAvailable){
      authUsername.focus();
      authSubmit.disabled = false;
      return;
    }
    if (password !== authConfirm.value){
      setAuthMessage('Passwords do not match.');
      authConfirm.focus();
      authSubmit.disabled = false;
      return;
    }
    const {data, error} = await supabaseClient.auth.signUp({
      email,
      password,
      options: {data: {full_name: name, username}}
    });
    if (error){
      setAuthMessage(error.message);
      authSubmit.disabled = false;
      return;
    }
    if (!data.session){
      setAuthMessage('Email sent. Confirm your email before signing in.', false);
      authSubmit.disabled = false;
      return;
    }
    showWorkspace(data.user);
    authSubmit.disabled = false;
    return;
  }

  const {data, error} = await supabaseClient.auth.signInWithPassword({email, password});
  if (error){
    setAuthMessage(error.message);
    authSubmit.disabled = false;
    return;
  }
  showWorkspace(data.user);
  authSubmit.disabled = false;
});

logoutBtn.addEventListener('click', async () => {
  if (presenceChannel){
    await supabaseClient.removeChannel(presenceChannel);
    presenceChannel = null;
  }
  await supabaseClient.auth.signOut();
  authForm.reset();
  updateAuthMode('signin');
  showAuth();
});

passwordChangeToggle.addEventListener('click', () => {
  const isOpen = !passwordChangeForm.hidden;
  passwordChangeForm.hidden = isOpen;
  passwordChangeToggle.setAttribute('aria-expanded', String(!isOpen));
  passwordChangeToggle.textContent = isOpen ? 'Change password' : 'Hide password change';
  if (isOpen) passwordChangeMessage.textContent = '';
});

passwordChangeForm.addEventListener('submit', async event => {
  event.preventDefault();
  const email = changeEmail.value.trim().toLowerCase();
  const password = currentPassword.value;
  const {error: signInError} = await supabaseClient.auth.signInWithPassword({email, password});

  if (signInError){
    passwordChangeMessage.textContent = signInError.message;
    passwordChangeMessage.classList.add('error');
    return;
  }
  if (newPassword.value !== newPasswordConfirm.value){
    passwordChangeMessage.textContent = 'New passwords do not match.';
    passwordChangeMessage.classList.add('error');
    return;
  }

  const {error} = await supabaseClient.auth.updateUser({password: newPassword.value});
  if (error){
    passwordChangeMessage.textContent = error.message;
    passwordChangeMessage.classList.add('error');
    return;
  }
  await supabaseClient.auth.signOut();
  passwordChangeMessage.textContent = 'Password updated. You can sign in now.';
  passwordChangeMessage.classList.remove('error');
  authForm.reset();
  passwordChangeForm.reset();
  showAuth();
});

// Supabase-backed chat state
let currentUser = null;
let activeConversationId = null;
let activeChannel = null;
let presenceChannel = null;
let users = [];

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
const sendBtn = document.getElementById('sendBtn');
const menuBtn = document.getElementById('menuBtn');
const chatMenu = document.getElementById('chatMenu');
const clearChatsBtn = document.getElementById('clearChatsBtn');
const profilePictureBtn = document.getElementById('profilePictureBtn');
const profilePictureInput = document.getElementById('profilePictureInput');
const viewTabs = document.querySelectorAll('.view-tab');
const viewPanels = document.querySelectorAll('[data-view-panel]');
const sidebarToggle = document.getElementById('sidebarToggle');
const themeToggle = document.getElementById('themeToggle');
const emojiPicker = document.getElementById('emojiPicker');
const taskForm = document.getElementById('taskForm');
const taskTitle = document.getElementById('taskTitle');
const taskDescription = document.getElementById('taskDescription');
const taskSearch = document.getElementById('taskSearch');
const taskCount = document.getElementById('taskCount');
const tasksContainer = document.getElementById('tasks');
const filterButtons = document.querySelectorAll('.filter-btn');

let activeUserId = null;
let activeTaskFilter = 'all';
let tasks = JSON.parse(localStorage.getItem('chatAppTasks') || '[]');

function closeChatMenu(){
  chatMenu.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
}

menuBtn.addEventListener('click', event => {
  event.stopPropagation();
  chatMenu.hidden = !chatMenu.hidden;
  menuBtn.setAttribute('aria-expanded', String(!chatMenu.hidden));
});

sidebarToggle.addEventListener('click', () => {
  const isOpen = document.body.classList.toggle('sidebar-open');
  sidebarToggle.setAttribute('aria-expanded', String(isOpen));
});

document.addEventListener('click', event => {
  if (!chatMenu.contains(event.target) && event.target !== menuBtn) closeChatMenu();
  if (!event.target.closest('.sidebar') && !event.target.closest('#sidebarToggle')) {
    document.body.classList.remove('sidebar-open');
    sidebarToggle.setAttribute('aria-expanded', 'false');
  }
});

const savedTheme = localStorage.getItem('nexusTheme') || 'dark';
document.body.classList.toggle('theme-light', savedTheme === 'light');
themeToggle.setAttribute('aria-pressed', String(savedTheme === 'light'));
themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('theme-light');
  const nextTheme = isLight ? 'light' : 'dark';
  localStorage.setItem('nexusTheme', nextTheme);
  themeToggle.setAttribute('aria-pressed', String(isLight));
  themeToggle.textContent = isLight ? '☀️' : '🌙';
});

clearChatsBtn.addEventListener('click', async () => {
  closeChatMenu();
  if (!currentUser) return;
  if (!window.confirm('Clear all your chats permanently? This cannot be undone.')) return;

  clearChatsBtn.disabled = true;
  const {error} = await supabaseClient.rpc('clear_user_chats');
  clearChatsBtn.disabled = false;
  if (error){
    contactPresence.textContent = error.message;
    return;
  }

  activeConversationId = null;
  activeUserId = null;
  messagesWrap.innerHTML = '';
  contactName.textContent = 'Select a chat';
  contactPresence.textContent = 'Offline';
  chatAvatar.textContent = '';
});

profilePictureBtn.addEventListener('click', () => {
  closeChatMenu();
  profilePictureInput.click();
});

profilePictureInput.addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file || !currentUser) return;
  if (!file.type.startsWith('image/')) return;

  profilePictureBtn.disabled = true;
  const extension = file.name.split('.').pop().toLowerCase() || 'jpg';
  const filePath = `${currentUser.id}/profile.${extension}`;
  const {error: uploadError} = await supabaseClient.storage
    .from('avatars')
    .upload(filePath, file, {upsert: true, contentType: file.type});

  if (uploadError){
    contactPresence.textContent = uploadError.message;
    profilePictureBtn.disabled = false;
    profilePictureInput.value = '';
    return;
  }

  const {data: publicUrlData} = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
  const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
  const {error: profileError} = await supabaseClient
    .from('profiles')
    .update({avatar_url: avatarUrl})
    .eq('id', currentUser.id);

  profilePictureBtn.disabled = false;
  profilePictureInput.value = '';
  if (profileError){
    contactPresence.textContent = profileError.message;
    return;
  }
  contactPresence.textContent = 'Profile picture updated';
});

function setView(view, updateHistory = true){
  const nextView = view === 'tasks' ? 'tasks' : 'chat';
  viewPanels.forEach(panel => {
    panel.hidden = panel.dataset.viewPanel !== nextView;
  });
  viewTabs.forEach(tab => {
    const isActive = tab.dataset.view === nextView;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-pressed', String(isActive));
  });
  if (updateHistory && window.location.hash !== `#${nextView}`){
    window.history.pushState({view: nextView}, '', `#${nextView}`);
  }
  if (nextView === 'tasks') renderTasks();
}

viewTabs.forEach(tab => tab.addEventListener('click', () => setView(tab.dataset.view)));
window.addEventListener('popstate', () => setView(window.location.hash.slice(1), false));
window.addEventListener('hashchange', () => setView(window.location.hash.slice(1), false));

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
    if (u.avatarUrl){
      avatar.style.backgroundImage = `url("${u.avatarUrl}")`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      avatar.textContent = '';
    } else {
      avatar.textContent = initials(u.name);
    }

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

function updateOnlineUsers(onlineIds){
  users = users.map(user => ({...user, online: onlineIds.has(user.id)}));
  const query = searchInput.value.trim().toLowerCase();
  const visibleUsers = users.filter(user => user.name.toLowerCase().includes(query) || user.preview.toLowerCase().includes(query));
  renderUsers(visibleUsers);

  if (activeUserId){
    const activeUser = users.find(user => user.id === activeUserId);
    if (activeUser) contactPresence.textContent = activeUser.online ? 'Online' : 'Offline';
  }
}

function subscribeToPresence(){
  if (presenceChannel) supabaseClient.removeChannel(presenceChannel);

  presenceChannel = supabaseClient
    .channel('workspace-presence', {config: {presence: {key: currentUser.id}}})
    .on('presence', {event: 'sync'}, () => {
      updateOnlineUsers(new Set(Object.keys(presenceChannel.presenceState())));
    })
    .subscribe(async status => {
      if (status === 'SUBSCRIBED'){
        await presenceChannel.track({online_at: new Date().toISOString()});
      }
    });
}

async function openChat(userId){
  activeUserId = userId;
  const user = users.find(u=>u.id === userId);
  if (!user) return;
  contactName.textContent = user.fullName && user.username ? `${user.fullName} (@${user.username})` : (user.username ? `@${user.username}` : user.fullName || 'Unnamed user');
  contactPresence.textContent = user.online ? 'Online' : 'Offline';
  chatAvatar.textContent = user.avatarUrl ? '' : initials(user.fullName || user.username || 'User');
  chatAvatar.style.backgroundImage = user.avatarUrl ? `url("${user.avatarUrl}")` : '';
  chatAvatar.style.backgroundSize = user.avatarUrl ? 'cover' : '';
  chatAvatar.style.backgroundPosition = user.avatarUrl ? 'center' : '';

  const {data: conversationId, error} = await supabaseClient.rpc('get_or_create_conversation', {
    other_user_id: userId
  });
  if (error){
    messagesWrap.innerHTML = '';
    contactPresence.textContent = 'Conversation setup required';
    const notice = document.createElement('p');
    notice.className = 'auth-message error';
    notice.textContent = error.message;
    messagesWrap.appendChild(notice);
    return;
  }
  activeConversationId = conversationId;
  await loadMessages(activeConversationId);
  subscribeToConversation(activeConversationId);
}

async function loadContacts(){
  if (!currentUser) return;
  const {data, error} = await supabaseClient
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .neq('id', currentUser.id)
    .order('username');
  if (error){
    console.error(error.message);
    return;
  }
  users = (data || []).map(profile => ({
    id: profile.id,
    fullName: profile.full_name || 'Unnamed user',
    username: profile.username || '',
    name: profile.username ? `@${profile.username}` : (profile.full_name || 'Unnamed user'),
    avatarUrl: profile.avatar_url || '',
    lastSeen: '',
    online: false,
    preview: 'Start a conversation',
    lastTime: '',
    unread: 0,
    read: false
  }));
  renderUsers(users);
  subscribeToPresence();
  if (!users.length){
    contactName.textContent = 'No other users yet';
    contactPresence.textContent = 'Create another account to start chatting';
    chatAvatar.textContent = '';
  }
}

async function loadMessages(conversationId){
  const {data, error} = await supabaseClient
    .from('messages')
    .select('id, content, sender_id, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', {ascending: true});
  if (error){
    console.error(error.message);
    return;
  }

  messagesWrap.innerHTML = '';
  (data || []).forEach(renderRemoteMessage);
  scrollToBottom();
}

function renderRemoteMessage(message){
  if (message.id && messagesWrap.querySelector(`[data-message-id="${message.id}"]`)) return;
  appendMessageToDOM({
    id: message.id,
    from: message.sender_id === currentUser.id ? 'me' : 'them',
    text: message.content,
    time: new Date(message.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
    status: 'delivered'
  });
}

function subscribeToConversation(conversationId){
  if (activeChannel) supabaseClient.removeChannel(activeChannel);
  activeChannel = supabaseClient
    .channel(`conversation-${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, payload => {
      renderRemoteMessage(payload.new);
      scrollToBottom();
    })
    .subscribe();
}

function appendMessageToDOM(message){
  const row = document.createElement('div');
  row.className = 'msg-row ' + (message.from === 'me' ? 'sent' : 'received');
  if (message.id) row.dataset.messageId = message.id;

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

function showEmptyChatState(message = 'Select a chat to start messaging.'){
  messagesWrap.innerHTML = `
    <div class="tasks-empty" style="margin:auto; max-width:420px; background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.12); color:var(--muted);">
      <strong style="color:#fff;">${escapeHTML(message)}</strong>
      <span>Choose a contact from the left and send the first message.</span>
    </div>
  `;
}

// search filtering
searchInput.addEventListener('input', (e)=>{
  const q = e.target.value.trim().toLowerCase();
  const filtered = users.filter(u => u.name.toLowerCase().includes(q) || u.preview.toLowerCase().includes(q));
  renderUsers(filtered);
});

async function sendCurrentMessage(){
  if (!activeConversationId || !currentUser) return;
  const content = messageInput.value.trim();
  if (!content) return;

  messageInput.disabled = true;
  const {data, error} = await supabaseClient.from('messages').insert({
    conversation_id: activeConversationId,
    sender_id: currentUser.id,
    content
  }).select('id, content, sender_id, created_at').single();
  messageInput.disabled = false;
  if (error){
    console.error(error.message);
    contactPresence.textContent = error.message;
    return;
  }
  if (data) renderRemoteMessage(data);
  messageInput.value = '';
  messageInput.focus();
}

// Send messages through Supabase; realtime renders the inserted row.
messageInput.addEventListener('keydown', async event => {
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  await sendCurrentMessage();
});

sendBtn.addEventListener('click', async () => {
  await sendCurrentMessage();
});

// file/emoji/mic placeholders
fileInput.addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f || !activeUserId) return;
  const content = `📎 ${f.name}`;
  if (!activeConversationId || !currentUser) return;
  const {data, error} = await supabaseClient.from('messages').insert({
    conversation_id: activeConversationId,
    sender_id: currentUser.id,
    content
  }).select('id, content, sender_id, created_at').single();
  if (error) console.error(error.message);
  if (data) renderRemoteMessage(data);
  fileInput.value = '';
});

emojiBtn.addEventListener('click', () => {
  if (!activeUserId) return;
  emojiPicker.hidden = !emojiPicker.hidden;
  if (!emojiPicker.hidden) messageInput.focus();
});

emojiPicker.addEventListener('click', event => {
  const button = event.target.closest('[data-emoji]');
  if (!button) return;
  const emoji = button.dataset.emoji;
  const currentValue = messageInput.value || '';
  messageInput.value = `${currentValue}${emoji}`;
  emojiPicker.hidden = true;
  messageInput.focus();
  messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
});

document.addEventListener('click', event => {
  if (!event.target.closest('#emojiBtn') && !event.target.closest('.emoji-picker')) {
    emojiPicker.hidden = true;
  }
});

micBtn.addEventListener('click', ()=>{
  // placeholder - you could integrate WebAudio / MediaRecorder here
  alert('Microphone recording placeholder. Integrate MediaRecorder for recording.');
});

function saveTasks(){
  localStorage.setItem('chatAppTasks', JSON.stringify(tasks));
}

function escapeHTML(text){
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderTasks(){
  const query = taskSearch.value.trim().toLowerCase();
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(query) || task.description.toLowerCase().includes(query);
    const matchesFilter = activeTaskFilter === 'all' || (activeTaskFilter === 'completed' ? task.completed : !task.completed);
    return matchesSearch && matchesFilter;
  });
  const completedCount = tasks.filter(task => task.completed).length;
  taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}${completedCount ? ` · ${completedCount} done` : ''}`;

  if (!filteredTasks.length){
    tasksContainer.innerHTML = `<div class="tasks-empty"><strong>No tasks here.</strong><span>Add a note above and keep momentum.</span></div>`;
    return;
  }

  tasksContainer.innerHTML = filteredTasks.map(task => `
    <article class="task-item ${task.completed ? 'completed' : ''}">
      <div class="task-item-main">
        <button class="task-check" type="button" data-action="toggle" data-id="${task.id}" aria-label="${task.completed ? 'Mark task open' : 'Mark task complete'}" aria-pressed="${task.completed}">${task.completed ? '✓' : ''}</button>
        <div class="task-copy">
          <h2>${escapeHTML(task.title)}</h2>
          <p>${escapeHTML(task.description) || 'No description'}</p>
          <time datetime="${task.createdAt}">Added ${escapeHTML(task.date)}</time>
        </div>
      </div>
      <div class="task-actions">
        <button type="button" data-action="edit" data-id="${task.id}">Edit</button>
        <button type="button" data-action="delete" data-id="${task.id}">Delete</button>
      </div>
    </article>
  `).join('');
}

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = taskTitle.value.trim();
  const description = taskDescription.value.trim();
  if (!title && !description){
    taskTitle.focus();
    return;
  }
  tasks.unshift({
    id: Date.now(),
    title: title || 'Untitled task',
    description,
    completed: false,
    date: new Date().toLocaleString(),
    createdAt: new Date().toISOString()
  });
  saveTasks();
  taskForm.reset();
  renderTasks();
});

taskSearch.addEventListener('input', renderTasks);
filterButtons.forEach(button => button.addEventListener('click', () => {
  activeTaskFilter = button.dataset.filter;
  filterButtons.forEach(filter => filter.classList.toggle('active', filter === button));
  renderTasks();
}));

tasksContainer.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = Number(button.dataset.id);
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (button.dataset.action === 'toggle') task.completed = !task.completed;
  if (button.dataset.action === 'delete') tasks = tasks.filter(item => item.id !== id);
  if (button.dataset.action === 'edit'){
    const nextTitle = prompt('Edit task title:', task.title);
    if (nextTitle === null) return;
    const nextDescription = prompt('Edit note:', task.description);
    if (nextDescription === null) return;
    task.title = nextTitle.trim() || 'Untitled task';
    task.description = nextDescription.trim();
  }
  saveTasks();
  renderTasks();
});

// init
renderUsers(users);
showEmptyChatState();
setView(window.location.hash.slice(1) || 'chat', false);

async function restoreSupabaseSession(){
  if (!supabaseClient){
    showAuth();
    setAuthMessage('The Supabase library could not be loaded. Check your internet connection and reload.');
    return;
  }
  const {data, error} = await supabaseClient.auth.getSession();
  if (error){
    showAuth();
    setAuthMessage(error.message);
    return;
  }
  if (data.session?.user) showWorkspace(data.session.user);
  else showAuth();
}

if (supabaseClient){
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) showWorkspace(session.user);
    if (event === 'SIGNED_OUT') showAuth();
  });
}

restoreSupabaseSession();
