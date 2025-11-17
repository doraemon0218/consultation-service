// デモ用のローカルストレージ認証システム
// Firebase設定不要で動作します

// ユーザーデータの管理
const DEMO_USERS_KEY = 'demo_users';
const DEMO_CURRENT_USER_KEY = 'demo_current_user';
const DEMO_MESSAGES_KEY = 'demo_messages';
const DEMO_TAGS_KEY = 'demo_tags';
const DEMO_USER_SETTINGS_KEY = 'demo_user_settings';

// ユーザーを取得
function getUsers() {
    const usersJson = localStorage.getItem(DEMO_USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : {};
}

// ユーザーを保存
function saveUsers(users) {
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}

// 現在のユーザーを取得
function getCurrentUser() {
    const userJson = localStorage.getItem(DEMO_CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
}

// 現在のユーザーを保存
function saveCurrentUser(user) {
    if (user) {
        localStorage.setItem(DEMO_CURRENT_USER_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(DEMO_CURRENT_USER_KEY);
    }
}

// ユーザー登録
function demoSignup(email, password, username) {
    const users = getUsers();
    
    if (users[email]) {
        throw { code: 'auth/email-already-in-use', message: 'このメールアドレスは既に使用されています' };
    }
    
    const userId = 'user_' + Date.now();
    const user = {
        uid: userId,
        email: email,
        displayName: username,
        username: username
    };
    
    users[email] = {
        password: password, // デモ用なので平文保存（本番では絶対にしないこと）
        user: user
    };
    
    saveUsers(users);
    return { user: user };
}

// ユーザーログイン
function demoLogin(email, password) {
    const users = getUsers();
    
    if (!users[email]) {
        throw { code: 'auth/user-not-found', message: 'ユーザーが見つかりません' };
    }
    
    if (users[email].password !== password) {
        throw { code: 'auth/wrong-password', message: 'パスワードが正しくありません' };
    }
    
    return { user: users[email].user };
}

// ログアウト
function demoLogout() {
    saveCurrentUser(null);
}

// メッセージを取得
function getMessages() {
    const messagesJson = localStorage.getItem(DEMO_MESSAGES_KEY);
    return messagesJson ? JSON.parse(messagesJson) : [];
}

// メッセージを保存
function saveMessages(messages) {
    localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(messages));
}

// メッセージを追加
function addMessage(message) {
    const messages = getMessages();
    const newMessage = {
        id: 'msg_' + Date.now(),
        ...message,
        timestamp: new Date()
    };
    messages.push(newMessage);
    saveMessages(messages);
    return newMessage;
}

// タグを取得
function getTags() {
    const tagsJson = localStorage.getItem(DEMO_TAGS_KEY);
    return tagsJson ? JSON.parse(tagsJson) : [];
}

// タグを保存
function saveTags(tags) {
    localStorage.setItem(DEMO_TAGS_KEY, JSON.stringify(tags));
}

// タグを追加
function addTag(name) {
    const tags = getTags();
    const newTag = {
        id: 'tag_' + Date.now(),
        name: name,
        createdAt: new Date()
    };
    tags.push(newTag);
    saveTags(tags);
    return newTag;
}

// タグを削除
function deleteTag(tagId) {
    const tags = getTags();
    const filteredTags = tags.filter(t => t.id !== tagId);
    saveTags(filteredTags);
}

// ユーザー設定を取得
function getUserSettings(userId) {
    const settingsJson = localStorage.getItem(DEMO_USER_SETTINGS_KEY);
    const allSettings = settingsJson ? JSON.parse(settingsJson) : {};
    return allSettings[userId] || {};
}

// ユーザー設定を保存
function saveUserSettings(userId, settings) {
    const settingsJson = localStorage.getItem(DEMO_USER_SETTINGS_KEY);
    const allSettings = settingsJson ? JSON.parse(settingsJson) : {};
    allSettings[userId] = {
        ...allSettings[userId],
        ...settings,
        updatedAt: new Date()
    };
    localStorage.setItem(DEMO_USER_SETTINGS_KEY, JSON.stringify(allSettings));
}

// グローバルに公開
window.demoAuth = {
    signup: demoSignup,
    login: demoLogin,
    logout: demoLogout,
    getCurrentUser: getCurrentUser,
    saveCurrentUser: saveCurrentUser,
    getMessages: getMessages,
    addMessage: addMessage,
    saveMessages: saveMessages,
    getTags: getTags,
    addTag: addTag,
    deleteTag: deleteTag,
    getUserSettings: getUserSettings,
    saveUserSettings: saveUserSettings
};

