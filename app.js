// Firebase関数の参照
let auth, db, storage, googleProvider;
let currentUser = null;
let unsubscribeMessages = null;
let selectedImageFile = null;
let isAdmin = false;
let allMessages = [];
let allTags = [];
let filteredMessages = [];

// Firebase初期化を待つ
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = setInterval(() => {
            if (window.firebaseAuth && window.firebaseDb && window.firebaseStorage && window.googleProvider) {
                auth = window.firebaseAuth;
                db = window.firebaseDb;
                storage = window.firebaseStorage;
                googleProvider = window.googleProvider;
                clearInterval(checkFirebase);
                resolve();
            }
        }, 100);
    });
}

// 初期化
async function init() {
    await waitForFirebase();
    
    // 認証状態の監視
    window.firebaseFunctions.onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await checkAdminStatus();
            showTopPage();
            await loadUserSettings();
            updateUserDisplay();
        } else {
            currentUser = null;
            isAdmin = false;
            showAuth();
            if (unsubscribeMessages) {
                unsubscribeMessages();
            }
        }
    });
}

// 管理者かどうかを確認
async function checkAdminStatus() {
    if (!currentUser) {
        isAdmin = false;
        return;
    }
    
    try {
        const userDocRef = window.firebaseFunctions.doc(db, 'users', currentUser.uid);
        const userDoc = await window.firebaseFunctions.getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            isAdmin = userData.role === 'admin';
        } else {
            isAdmin = false;
        }
        
        // 管理者カードの表示/非表示
        const adminCard = document.getElementById('admin-card');
        if (adminCard) {
            adminCard.style.display = isAdmin ? 'block' : 'none';
        }
    } catch (error) {
        console.error('管理者確認エラー:', error);
        isAdmin = false;
    }
}

// 認証画面を表示
function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('top-page').style.display = 'none';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('settings-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'none';
}

// トップページを表示
function showTopPage() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('top-page').style.display = 'flex';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('settings-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'none';
    updateTopPageUserDisplay();
}

// チャット画面を表示
function showChat() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('top-page').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';
    document.getElementById('settings-page').style.display = 'none';
    loadMessages();
    updateUserDisplay();
}

// 個人設定画面を表示
function showSettings() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('top-page').style.display = 'none';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('settings-page').style.display = 'flex';
    document.getElementById('admin-page').style.display = 'none';
    loadSettingsForm();
}

// 管理者ページを表示
function showAdminPage() {
    if (!isAdmin) {
        alert('管理者権限が必要です');
        return;
    }
    
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('top-page').style.display = 'none';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('settings-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'flex';
    
    loadAdminData();
}

// サインアップフォームを表示
function showSignup() {
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
    clearError();
}

// ログインフォームを表示
function showLogin() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    clearError();
}

// エラーメッセージを表示
function showError(message) {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

// エラーメッセージをクリア
function clearError() {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
}

// サインアップ処理
async function handleSignup() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const username = document.getElementById('signup-username').value;

    if (!email || !password || !username) {
        showError('すべての項目を入力してください');
        return;
    }

    if (password.length < 6) {
        showError('パスワードは6文字以上で入力してください');
        return;
    }

    try {
        clearError();
        const userCredential = await window.firebaseFunctions.createUserWithEmailAndPassword(auth, email, password);
        
        // ユーザー名をFirestoreに保存（必要に応じて）
        // ここでは簡略化のため、メールアドレスを使用
        
        // フォームをクリア
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-username').value = '';
    } catch (error) {
        let errorMessage = 'エラーが発生しました';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'このメールアドレスは既に使用されています';
                break;
            case 'auth/invalid-email':
                errorMessage = 'メールアドレスの形式が正しくありません';
                break;
            case 'auth/weak-password':
                errorMessage = 'パスワードが弱すぎます';
                break;
        }
        showError(errorMessage);
    }
}

// ログイン処理
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showError('メールアドレスとパスワードを入力してください');
        return;
    }

    try {
        clearError();
        await window.firebaseFunctions.signInWithEmailAndPassword(auth, email, password);
        
        // フォームをクリア
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
    } catch (error) {
        let errorMessage = 'ログインに失敗しました';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'ユーザーが見つかりません';
                break;
            case 'auth/wrong-password':
                errorMessage = 'パスワードが正しくありません';
                break;
            case 'auth/invalid-email':
                errorMessage = 'メールアドレスの形式が正しくありません';
                break;
        }
        showError(errorMessage);
    }
}

// Googleログイン処理
async function handleGoogleLogin() {
    try {
        clearError();
        await window.firebaseFunctions.signInWithPopup(auth, googleProvider);
    } catch (error) {
        let errorMessage = 'Googleログインに失敗しました';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'ログインがキャンセルされました';
        }
        showError(errorMessage);
    }
}

// ログアウト処理
async function handleLogout() {
    try {
        await window.firebaseFunctions.signOut(auth);
    } catch (error) {
        console.error('ログアウトエラー:', error);
    }
}

// ユーザー情報を表示（チャット画面用）
function updateUserDisplay() {
    if (currentUser) {
        const displayName = currentUser.displayName || currentUser.email || 'ユーザー';
        const currentUserEl = document.getElementById('current-user');
        if (currentUserEl) {
            currentUserEl.textContent = `👤 ${displayName}`;
        }
    }
}

// ユーザー情報を表示（トップページ用）
function updateTopPageUserDisplay() {
    if (currentUser) {
        const displayName = currentUser.displayName || currentUser.email || 'ユーザー';
        const topUserNameEl = document.getElementById('top-user-name');
        if (topUserNameEl) {
            topUserNameEl.textContent = `👤 ${displayName}`;
        }
    }
}

// 個人設定を読み込む
async function loadUserSettings() {
    if (!currentUser) return;
    
    try {
        const userDocRef = window.firebaseFunctions.doc(db, 'users', currentUser.uid);
        const userDoc = await window.firebaseFunctions.getDoc(userDocRef);
        
        if (userDoc.exists()) {
            // 設定が存在する場合は使用（後で使用する可能性がある）
            return userDoc.data();
        }
    } catch (error) {
        console.error('設定読み込みエラー:', error);
    }
    return null;
}

// 個人設定フォームに値を設定
async function loadSettingsForm() {
    if (!currentUser) return;
    
    try {
        const userDocRef = window.firebaseFunctions.doc(db, 'users', currentUser.uid);
        const userDoc = await window.firebaseFunctions.getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const settings = userDoc.data();
            document.getElementById('setting-age').value = settings.age || '';
            document.getElementById('setting-consultations-per-day').value = settings.consultationsPerDay || '1';
            document.getElementById('setting-email-notification').checked = settings.emailNotification !== false;
        }
    } catch (error) {
        console.error('設定読み込みエラー:', error);
    }
}

// 個人設定を保存
async function saveSettings() {
    if (!currentUser) return;
    
    const age = document.getElementById('setting-age').value;
    const consultationsPerDay = document.getElementById('setting-consultations-per-day').value;
    const emailNotification = document.getElementById('setting-email-notification').checked;
    
    try {
        const userDocRef = window.firebaseFunctions.doc(db, 'users', currentUser.uid);
        await window.firebaseFunctions.setDoc(userDocRef, {
            age: age ? parseInt(age) : null,
            consultationsPerDay: parseInt(consultationsPerDay),
            emailNotification: emailNotification,
            updatedAt: window.firebaseFunctions.serverTimestamp()
        }, { merge: true });
        
        const messageEl = document.getElementById('settings-message');
        messageEl.textContent = '設定を保存しました';
        messageEl.className = 'settings-message success';
        
        setTimeout(() => {
            messageEl.className = 'settings-message';
            messageEl.textContent = '';
        }, 3000);
    } catch (error) {
        console.error('設定保存エラー:', error);
        const messageEl = document.getElementById('settings-message');
        messageEl.textContent = '設定の保存に失敗しました';
        messageEl.className = 'settings-message error';
    }
}

// 画像選択処理
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
        alert('画像サイズは5MB以下にしてください');
        return;
    }

    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImg = document.getElementById('preview-img');
        const previewDiv = document.getElementById('image-preview');
        previewImg.src = e.target.result;
        previewDiv.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// 画像アップロードをキャンセル
function cancelImageUpload() {
    selectedImageFile = null;
    document.getElementById('image-input').value = '';
    document.getElementById('image-preview').style.display = 'none';
}

// メッセージを送信
async function sendMessage() {
    if (!currentUser) return;

    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    let imageUrl = null;

    // テキストも画像もない場合は送信しない
    if (!messageText && !selectedImageFile) return;

    try {
        // 画像がある場合はアップロード
        if (selectedImageFile) {
            const imageRef = window.firebaseFunctions.ref(storage, `chat-images/${currentUser.uid}/${Date.now()}_${selectedImageFile.name}`);
            await window.firebaseFunctions.uploadBytes(imageRef, selectedImageFile);
            imageUrl = await window.firebaseFunctions.getDownloadURL(imageRef);
        }

        // メッセージを保存
        const messagesRef = window.firebaseFunctions.collection(db, 'messages');
        await window.firebaseFunctions.addDoc(messagesRef, {
            text: messageText || '',
            imageUrl: imageUrl || null,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            displayName: currentUser.displayName || currentUser.email,
            timestamp: window.firebaseFunctions.serverTimestamp()
        });

        // フォームをクリア
        messageInput.value = '';
        cancelImageUpload();
    } catch (error) {
        console.error('メッセージ送信エラー:', error);
        alert('メッセージの送信に失敗しました');
    }
}

// Enterキーで送信
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// メッセージを読み込む
function loadMessages() {
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    const messagesRef = window.firebaseFunctions.collection(db, 'messages');
    const q = window.firebaseFunctions.query(messagesRef, window.firebaseFunctions.orderBy('timestamp', 'asc'));

    unsubscribeMessages = window.firebaseFunctions.onSnapshot(q, (snapshot) => {
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.innerHTML = '';

        snapshot.forEach((doc) => {
            const message = doc.data();
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.userId === currentUser.uid ? 'own' : 'other'}`;

            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            
            // 画像がある場合は表示
            if (message.imageUrl) {
                const img = document.createElement('img');
                img.src = message.imageUrl;
                img.className = 'message-image';
                img.alt = 'アップロードされた画像';
                img.onclick = () => window.open(message.imageUrl, '_blank');
                bubble.appendChild(img);
            }
            
            // テキストがある場合は表示
            if (message.text) {
                const textDiv = document.createElement('div');
                textDiv.className = 'message-text';
                textDiv.textContent = message.text;
                bubble.appendChild(textDiv);
            }

            const info = document.createElement('div');
            info.className = 'message-info';
            
            if (message.userId !== currentUser.uid) {
                const username = document.createElement('div');
                username.className = 'message-username';
                username.textContent = message.displayName || message.userEmail;
                messageDiv.appendChild(username);
            }

            messageDiv.appendChild(bubble);
            messageDiv.appendChild(info);
            messagesContainer.appendChild(messageDiv);
        });

        // スクロールを最下部に
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, (error) => {
        console.error('メッセージ読み込みエラー:', error);
    });
}

// 管理者データを読み込む
async function loadAdminData() {
    await loadAllMessages();
    await loadTags();
    renderAdminMessages();
    updateTagFilter();
}

// すべてのメッセージを読み込む
async function loadAllMessages() {
    try {
        const messagesRef = window.firebaseFunctions.collection(db, 'messages');
        const querySnapshot = await window.firebaseFunctions.getDocs(messagesRef);
        
        allMessages = [];
        querySnapshot.forEach((doc) => {
            allMessages.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // タイムスタンプでソート（降順）
        allMessages.sort((a, b) => {
            const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
            const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
            return bTime - aTime;
        });
        
        filteredMessages = [...allMessages];
    } catch (error) {
        console.error('メッセージ読み込みエラー:', error);
        allMessages = [];
        filteredMessages = [];
    }
}

// タグを読み込む
async function loadTags() {
    try {
        const tagsRef = window.firebaseFunctions.collection(db, 'tags');
        const querySnapshot = await window.firebaseFunctions.getDocs(tagsRef);
        
        allTags = [];
        querySnapshot.forEach((doc) => {
            allTags.push({
                id: doc.id,
                name: doc.data().name,
                createdAt: doc.data().createdAt
            });
        });
        
        allTags.sort((a, b) => a.name.localeCompare(b.name));
        renderTags();
    } catch (error) {
        console.error('タグ読み込みエラー:', error);
        allTags = [];
    }
}

// 新しいタグを追加
async function addNewTag() {
    const tagInput = document.getElementById('new-tag-input');
    const tagName = tagInput.value.trim();
    
    if (!tagName) {
        alert('タグ名を入力してください');
        return;
    }
    
    // 既存のタグかチェック
    if (allTags.some(tag => tag.name === tagName)) {
        alert('このタグは既に存在します');
        tagInput.value = '';
        return;
    }
    
    try {
        const tagsRef = window.firebaseFunctions.collection(db, 'tags');
        await window.firebaseFunctions.addDoc(tagsRef, {
            name: tagName,
            createdAt: window.firebaseFunctions.serverTimestamp()
        });
        
        tagInput.value = '';
        await loadTags();
    } catch (error) {
        console.error('タグ追加エラー:', error);
        alert('タグの追加に失敗しました');
    }
}

// タグを表示
function renderTags() {
    const tagsList = document.getElementById('tags-list');
    tagsList.innerHTML = '';
    
    allTags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag-item';
        tagElement.innerHTML = `
            <span class="tag-name">${tag.name}</span>
            <button onclick="deleteTag('${tag.id}')" class="delete-tag-btn">削除</button>
        `;
        tagsList.appendChild(tagElement);
    });
}

// タグを削除
async function deleteTag(tagId) {
    if (!confirm('このタグを削除しますか？')) return;
    
    try {
        const tagRef = window.firebaseFunctions.doc(db, 'tags', tagId);
        await tagRef.delete();
        
        // このタグを持つメッセージからもタグを削除
        const messagesWithTag = allMessages.filter(msg => msg.tags && msg.tags.includes(tagId));
        for (const msg of messagesWithTag) {
            const msgRef = window.firebaseFunctions.doc(db, 'messages', msg.id);
            const updatedTags = msg.tags.filter(t => t !== tagId);
            await window.firebaseFunctions.setDoc(msgRef, { tags: updatedTags }, { merge: true });
        }
        
        await loadTags();
        await loadAllMessages();
        renderAdminMessages();
    } catch (error) {
        console.error('タグ削除エラー:', error);
        alert('タグの削除に失敗しました');
    }
}

// タグフィルターを更新
function updateTagFilter() {
    const tagFilter = document.getElementById('tag-filter');
    tagFilter.innerHTML = '<option value="">すべてのタグ</option>';
    
    allTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.id;
        option.textContent = tag.name;
        tagFilter.appendChild(option);
    });
}

// メッセージをフィルタリング
function filterMessages() {
    const tagFilter = document.getElementById('tag-filter').value;
    const searchText = document.getElementById('search-input').value.toLowerCase();
    
    filteredMessages = allMessages.filter(msg => {
        // タグフィルター
        if (tagFilter) {
            if (!msg.tags || !msg.tags.includes(tagFilter)) {
                return false;
            }
        }
        
        // テキスト検索
        if (searchText) {
            const text = msg.text || '';
            if (!text.toLowerCase().includes(searchText)) {
                return false;
            }
        }
        
        return true;
    });
    
    renderAdminMessages();
}

// フィルターをクリア
function clearFilters() {
    document.getElementById('tag-filter').value = '';
    document.getElementById('search-input').value = '';
    filteredMessages = [...allMessages];
    renderAdminMessages();
}

// 管理者用メッセージを表示
function renderAdminMessages() {
    const container = document.getElementById('admin-messages-container');
    container.innerHTML = '';
    
    if (filteredMessages.length === 0) {
        container.innerHTML = '<p class="no-messages">メッセージがありません</p>';
        return;
    }
    
    filteredMessages.forEach(msg => {
        const msgElement = document.createElement('div');
        msgElement.className = 'admin-message-item';
        msgElement.innerHTML = `
            <div class="message-checkbox">
                <input type="checkbox" class="message-select" data-message-id="${msg.id}">
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-user">${msg.displayName || msg.userEmail}</span>
                    <span class="message-date">${formatDate(msg.timestamp)}</span>
                </div>
                ${msg.imageUrl ? `<img src="${msg.imageUrl}" class="admin-message-image" alt="画像">` : ''}
                ${msg.text ? `<div class="admin-message-text">${msg.text}</div>` : ''}
                <div class="message-tags">
                    <select class="tag-selector" data-message-id="${msg.id}" onchange="addTagToMessage('${msg.id}', this.value)">
                        <option value="">タグを追加</option>
                        ${allTags.map(tag => `<option value="${tag.id}">${tag.name}</option>`).join('')}
                    </select>
                    <div class="current-tags">
                        ${renderMessageTags(msg)}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(msgElement);
    });
}

// メッセージのタグを表示
function renderMessageTags(message) {
    if (!message.tags || message.tags.length === 0) {
        return '<span class="no-tags">タグなし</span>';
    }
    
    return message.tags.map(tagId => {
        const tag = allTags.find(t => t.id === tagId);
        if (!tag) return '';
        return `<span class="message-tag">${tag.name} <button onclick="removeTagFromMessage('${message.id}', '${tagId}')" class="remove-tag-btn">×</button></span>`;
    }).join('');
}

// メッセージにタグを追加
async function addTagToMessage(messageId, tagId) {
    if (!tagId) return;
    
    try {
        const msgRef = window.firebaseFunctions.doc(db, 'messages', messageId);
        const msgDoc = await window.firebaseFunctions.getDoc(msgRef);
        
        if (msgDoc.exists()) {
            const currentTags = msgDoc.data().tags || [];
            if (!currentTags.includes(tagId)) {
                await window.firebaseFunctions.setDoc(msgRef, {
                    tags: [...currentTags, tagId]
                }, { merge: true });
                
                await loadAllMessages();
                renderAdminMessages();
            }
        }
    } catch (error) {
        console.error('タグ追加エラー:', error);
        alert('タグの追加に失敗しました');
    }
}

// メッセージからタグを削除
async function removeTagFromMessage(messageId, tagId) {
    try {
        const msgRef = window.firebaseFunctions.doc(db, 'messages', messageId);
        const msgDoc = await window.firebaseFunctions.getDoc(msgRef);
        
        if (msgDoc.exists()) {
            const currentTags = msgDoc.data().tags || [];
            const updatedTags = currentTags.filter(t => t !== tagId);
            await window.firebaseFunctions.setDoc(msgRef, {
                tags: updatedTags
            }, { merge: true });
            
            await loadAllMessages();
            renderAdminMessages();
        }
    } catch (error) {
        console.error('タグ削除エラー:', error);
        alert('タグの削除に失敗しました');
    }
}

// すべてのメッセージを選択
function selectAllMessages() {
    document.querySelectorAll('.message-select').forEach(checkbox => {
        checkbox.checked = true;
    });
}

// すべてのメッセージの選択を解除
function deselectAllMessages() {
    document.querySelectorAll('.message-select').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// 選択したメッセージを統合
async function mergeSelectedMessages() {
    const selectedCheckboxes = document.querySelectorAll('.message-select:checked');
    
    if (selectedCheckboxes.length < 2) {
        alert('統合するには2つ以上のメッセージを選択してください');
        return;
    }
    
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.messageId);
    const selectedMessages = allMessages.filter(msg => selectedIds.includes(msg.id));
    
    // 統合先のメッセージを選択（最初のメッセージ）
    const targetMessage = selectedMessages[0];
    const otherMessages = selectedMessages.slice(1);
    
    // すべてのタグを統合
    const allTagIds = new Set(targetMessage.tags || []);
    otherMessages.forEach(msg => {
        if (msg.tags) {
            msg.tags.forEach(tagId => allTagIds.add(tagId));
        }
    });
    
    try {
        // 統合先メッセージにタグを統合
        const targetRef = window.firebaseFunctions.doc(db, 'messages', targetMessage.id);
        await window.firebaseFunctions.setDoc(targetRef, {
            tags: Array.from(allTagIds),
            mergedFrom: otherMessages.map(m => m.id),
            mergedAt: window.firebaseFunctions.serverTimestamp()
        }, { merge: true });
        
        // 統合元メッセージを削除（またはマーク）
        for (const msg of otherMessages) {
            const msgRef = window.firebaseFunctions.doc(db, 'messages', msg.id);
            await window.firebaseFunctions.setDoc(msgRef, {
                mergedInto: targetMessage.id,
                isMerged: true
            }, { merge: true });
        }
        
        alert(`${selectedMessages.length}件のメッセージを統合しました`);
        await loadAllMessages();
        renderAdminMessages();
    } catch (error) {
        console.error('メッセージ統合エラー:', error);
        alert('メッセージの統合に失敗しました');
    }
}

// 日付をフォーマット
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ja-JP');
}

// ページ読み込み時に初期化
init();

