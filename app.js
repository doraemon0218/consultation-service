// Firebase関数の参照
let auth, db, storage, googleProvider;
let currentUser = null;
let unsubscribeMessages = null;
let selectedImageFile = null;
let isAdmin = false;
let allMessages = [];
let allTags = [];
let filteredMessages = [];
let currentQuestionId = null;
let questionImageFile = null;

// Firebase初期化を待つ
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5秒待機
        
        const checkFirebase = setInterval(() => {
            attempts++;
            
            if (window.firebaseAuth && window.firebaseDb && window.firebaseStorage && window.googleProvider) {
                auth = window.firebaseAuth;
                db = window.firebaseDb;
                storage = window.firebaseStorage;
                googleProvider = window.googleProvider;
                clearInterval(checkFirebase);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkFirebase);
                console.error('Firebase初期化タイムアウト');
                reject(new Error('Firebaseの初期化に失敗しました。設定を確認してください。'));
            }
        }, 100);
    });
}

// 初期化
async function init() {
    // デモモード: ローカルストレージ認証を使用
    const useDemoMode = !window.firebaseAuth || !window.firebaseDb;
    
    if (useDemoMode) {
        console.log('🎮 デモモードで動作中（ローカルストレージ認証）');
        // 既存のログインユーザーを確認
        const savedUser = window.demoAuth.getCurrentUser();
        if (savedUser) {
            currentUser = savedUser;
            await checkAdminStatus();
            showTopPage();
            await loadUserSettings();
            updateUserDisplay();
        } else {
            showAuth();
        }
        return;
    }
    
    // Firebaseモード
    try {
        await waitForFirebase();
        
        // Firebase設定の検証
        if (!auth || !db) {
            console.error('Firebaseが正しく初期化されていません');
            showError('Firebaseの設定に問題があります。設定を確認してください。');
            return;
        }
        
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
        }, (error) => {
            console.error('認証状態監視エラー:', error);
        });
    } catch (error) {
        console.error('初期化エラー:', error);
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) {
            errorDiv.textContent = 'Firebaseの初期化に失敗しました。デモモードで動作します。';
            errorDiv.classList.add('show');
        }
        // エラー時もデモモードで動作
        showAuth();
    }
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
    document.getElementById('question-form').style.display = 'none';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('settings-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'none';
    document.getElementById('consultation-history').style.display = 'none';
}

// トップページを表示
function showTopPage() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('top-page').style.display = 'flex';
    document.getElementById('question-form').style.display = 'none';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('settings-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'none';
    document.getElementById('consultation-history').style.display = 'none';
    currentQuestionId = null;
    updateTopPageUserDisplay();
}

// 質問フォーム画面を表示
function showQuestionForm() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('top-page').style.display = 'none';
    document.getElementById('question-form').style.display = 'flex';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('settings-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'none';
    document.getElementById('consultation-history').style.display = 'none';
    
    // フォームをリセット
    document.getElementById('question-category').value = '';
    document.getElementById('question-title').value = '';
    document.getElementById('question-text').value = '';
    cancelQuestionImageUpload();
}

// チャット画面を表示（質問フォームから）
function showChat(questionId) {
    console.log('showChat called with questionId:', questionId);
    
    try {
        // すべての画面を非表示
        const authContainer = document.getElementById('auth-container');
        const topPage = document.getElementById('top-page');
        const questionForm = document.getElementById('question-form');
        const settingsPage = document.getElementById('settings-page');
        const adminPage = document.getElementById('admin-page');
        const consultationHistory = document.getElementById('consultation-history');
        
        if (authContainer) authContainer.style.display = 'none';
        if (topPage) topPage.style.display = 'none';
        if (questionForm) questionForm.style.display = 'none';
        if (settingsPage) settingsPage.style.display = 'none';
        if (adminPage) adminPage.style.display = 'none';
        if (consultationHistory) consultationHistory.style.display = 'none';
        
        // チャット画面を表示
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) {
            console.error('chat-container要素が見つかりません');
            alert('チャット画面の読み込みに失敗しました。ページを再読み込みしてください。');
            return;
        }
        
        chatContainer.style.display = 'flex';
        console.log('チャット画面を表示しました');
        
        currentQuestionId = questionId;
        
        if (questionId) {
            if (!window.demoAuth) {
                console.error('window.demoAuth is not available');
                alert('システムエラーが発生しました。ページを再読み込みしてください。');
                return;
            }
            
            const question = window.demoAuth.getQuestionById(questionId);
            console.log('Question found:', question);
            
            if (question) {
                const chatTitle = document.getElementById('chat-title');
                if (chatTitle) {
                    chatTitle.textContent = question.title;
                    console.log('チャットタイトルを設定:', question.title);
                }
                
                // 質問ヘッダーを表示（タイトルと画像）
                displayQuestionHeader(question);
                
                // 解決済みでない場合は「解決しました！」ボタンを表示
                const resolveButtonContainer = document.getElementById('resolve-button-container');
                if (resolveButtonContainer) {
                    if (question.status !== 'resolved') {
                        resolveButtonContainer.style.display = 'block';
                    } else {
                        resolveButtonContainer.style.display = 'none';
                    }
                }
                
                // 管理者に通知されている場合はステータスを表示
                const chatStatus = document.getElementById('chat-status');
                if (chatStatus) {
                    if (question.status === 'admin-notified' || question.status === 'pending') {
                        chatStatus.style.display = 'block';
                        console.log('ステータスメッセージを表示');
                    } else {
                        chatStatus.style.display = 'none';
                    }
                }
            } else {
                console.warn('質問が見つかりませんでした。ID:', questionId);
            }
            
            // メッセージを読み込む
            loadChatMessages(questionId);
        } else {
            console.log('questionIdがないため、通常のメッセージを読み込みます');
            loadMessages();
        }
        
        updateUserDisplay();
        console.log('チャット画面の表示が完了しました');
        
    } catch (error) {
        console.error('showChat error:', error);
        console.error('エラー詳細:', error.stack);
        alert('チャット画面の表示に失敗しました: ' + (error.message || error));
    }
}

// 個人設定画面を表示
function showSettings() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('top-page').style.display = 'none';
    document.getElementById('question-form').style.display = 'none';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('settings-page').style.display = 'flex';
    document.getElementById('admin-page').style.display = 'none';
    document.getElementById('consultation-history').style.display = 'none';
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
    document.getElementById('question-form').style.display = 'none';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('settings-page').style.display = 'none';
    document.getElementById('consultation-history').style.display = 'none';
    document.getElementById('admin-page').style.display = 'flex';
    
    loadAdminData();
}

// 相談履歴画面を表示
function showConsultationHistory() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('top-page').style.display = 'none';
    document.getElementById('question-form').style.display = 'none';
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('settings-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'none';
    document.getElementById('consultation-history').style.display = 'flex';
    
    loadConsultationHistory();
}

// 相談履歴を読み込む
function loadConsultationHistory() {
    if (!window.demoAuth || !currentUser) {
        console.error('demoAuth or currentUser is not available');
        return;
    }
    
    const questions = window.demoAuth.getQuestions();
    // 現在のユーザーの質問のみをフィルタリング
    const userQuestions = questions.filter(q => q.userId === currentUser.uid);
    // 作成日時でソート（新しい順）
    userQuestions.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
    });
    
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    historyList.innerHTML = '';
    
    if (userQuestions.length === 0) {
        historyList.innerHTML = '<div class="no-history">相談履歴がありません</div>';
        return;
    }
    
    userQuestions.forEach((question) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const statusBadge = question.status === 'resolved' ? 
            '<span class="status-badge resolved">解決済み</span>' : 
            '<span class="status-badge pending">対応中</span>';
        
        historyItem.innerHTML = `
            <div class="history-item-header">
                <div class="history-item-title">【${getCategoryName(question.category)}】${question.title}</div>
                ${statusBadge}
            </div>
            <div class="history-item-text">${question.text.substring(0, 100)}${question.text.length > 100 ? '...' : ''}</div>
            <div class="history-item-footer">
                <span class="history-item-date">${formatDate(question.createdAt)}</span>
                <button onclick="openChatFromHistory('${question.id}')" class="view-chat-btn">チャットを見る</button>
            </div>
        `;
        
        historyList.appendChild(historyItem);
    });
}

// 履歴からチャットを開く
function openChatFromHistory(questionId) {
    showChat(questionId);
}

// 日付をフォーマット
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
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

    // デモモードかどうかを確認
    const useDemoMode = !auth || !db || !window.firebaseAuth;
    
    if (useDemoMode) {
        // デモモード: ローカルストレージ認証
        try {
            clearError();
            const userCredential = window.demoAuth.signup(email, password, username);
            window.demoAuth.saveCurrentUser(userCredential.user);
            currentUser = userCredential.user;
            
            // フォームをクリア
            document.getElementById('signup-email').value = '';
            document.getElementById('signup-password').value = '';
            document.getElementById('signup-username').value = '';
            
            // トップページに移動
            await checkAdminStatus();
            showTopPage();
            await loadUserSettings();
            updateUserDisplay();
        } catch (error) {
            showError(error.message || '登録に失敗しました');
        }
        return;
    }

    // Firebaseモード
    try {
        clearError();
        const userCredential = await window.firebaseFunctions.createUserWithEmailAndPassword(auth, email, password);
        
        // ユーザー名をFirestoreに保存
        if (userCredential.user) {
            const userDocRef = window.firebaseFunctions.doc(db, 'users', userCredential.user.uid);
            await window.firebaseFunctions.setDoc(userDocRef, {
                username: username,
                email: email,
                createdAt: window.firebaseFunctions.serverTimestamp()
            }, { merge: true });
        }
        
        // フォームをクリア
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-username').value = '';
    } catch (error) {
        console.error('サインアップエラー:', error);
        let errorMessage = 'エラーが発生しました';
        if (error.code) {
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
                case 'auth/operation-not-allowed':
                    errorMessage = 'この認証方法は有効になっていません。Firebase Consoleで設定を確認してください。';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
                    break;
                default:
                    errorMessage = `エラー: ${error.message || error.code || '不明なエラー'}`;
            }
        } else {
            errorMessage = `エラー: ${error.message || '不明なエラー'}`;
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

    // デモモードかどうかを確認
    const useDemoMode = !auth || !db || !window.firebaseAuth;
    
    if (useDemoMode) {
        // デモモード: ローカルストレージ認証
        try {
            clearError();
            const userCredential = window.demoAuth.login(email, password);
            window.demoAuth.saveCurrentUser(userCredential.user);
            currentUser = userCredential.user;
            
            // フォームをクリア
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            
            // トップページに移動
            await checkAdminStatus();
            showTopPage();
            await loadUserSettings();
            updateUserDisplay();
        } catch (error) {
            showError(error.message || 'ログインに失敗しました');
        }
        return;
    }

    // Firebaseモード
    try {
        clearError();
        await window.firebaseFunctions.signInWithEmailAndPassword(auth, email, password);
        
        // フォームをクリア
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
    } catch (error) {
        console.error('ログインエラー:', error);
        let errorMessage = 'ログインに失敗しました';
        if (error.code) {
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
                case 'auth/user-disabled':
                    errorMessage = 'このアカウントは無効化されています';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください。';
                    break;
                default:
                    errorMessage = `エラー: ${error.message || error.code || '不明なエラー'}`;
            }
        } else {
            errorMessage = `エラー: ${error.message || '不明なエラー'}`;
        }
        showError(errorMessage);
    }
}

// Googleログイン処理
async function handleGoogleLogin() {
    // デモモードではGoogleログインは使用不可
    const useDemoMode = !auth || !window.firebaseAuth;
    
    if (useDemoMode) {
        showError('デモモードではGoogleログインは使用できません。メールアドレスとパスワードでログインしてください。');
        return;
    }
    
    // Firebaseモード
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

// ログインをスキップ
function skipLogin() {
    // デモユーザーを作成してログイン状態にする
    const demoUser = {
        uid: 'demo_user_' + Date.now(),
        email: 'demo@example.com',
        displayName: 'デモユーザー',
        username: 'デモユーザー'
    };
    
    currentUser = demoUser;
    window.demoAuth.saveCurrentUser(demoUser);
    
    // トップページに移動
    checkAdminStatus();
    showTopPage();
    loadUserSettings();
    updateUserDisplay();
}

// ログアウト処理
async function handleLogout() {
    // デモモードかどうかを確認
    const useDemoMode = !auth || !window.firebaseAuth;
    
    if (useDemoMode) {
        window.demoAuth.logout();
        currentUser = null;
        isAdmin = false;
        showAuth();
        return;
    }
    
    // Firebaseモード
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
    
    // デモモードかどうかを確認
    const useDemoMode = !auth || !db || !window.firebaseAuth;
    
    if (useDemoMode) {
        return window.demoAuth.getUserSettings(currentUser.uid);
    }
    
    // Firebaseモード
    try {
        const userDocRef = window.firebaseFunctions.doc(db, 'users', currentUser.uid);
        const userDoc = await window.firebaseFunctions.getDoc(userDocRef);
        
        if (userDoc.exists()) {
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
    
    // デモモードかどうかを確認
    const useDemoMode = !auth || !db || !window.firebaseAuth;
    
    if (useDemoMode) {
        const settings = window.demoAuth.getUserSettings(currentUser.uid);
        document.getElementById('setting-age').value = settings.age || '';
        document.getElementById('setting-consultations-per-day').value = settings.consultationsPerDay || '1';
        document.getElementById('setting-email-notification').checked = settings.emailNotification !== false;
        return;
    }
    
    // Firebaseモード
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
    
    // デモモードかどうかを確認
    const useDemoMode = !auth || !db || !window.firebaseAuth;
    
    if (useDemoMode) {
        try {
            window.demoAuth.saveUserSettings(currentUser.uid, {
                age: age ? parseInt(age) : null,
                consultationsPerDay: parseInt(consultationsPerDay),
                emailNotification: emailNotification
            });
            
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
        return;
    }
    
    // Firebaseモード
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

// 質問画像選択処理
function handleQuestionImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
        alert('画像サイズは5MB以下にしてください');
        return;
    }

    questionImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImg = document.getElementById('question-preview-img');
        const previewDiv = document.getElementById('question-image-preview');
        previewImg.src = e.target.result;
        previewDiv.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// 質問画像アップロードをキャンセル
function cancelQuestionImageUpload() {
    questionImageFile = null;
    document.getElementById('question-image-input').value = '';
    document.getElementById('question-image-preview').style.display = 'none';
}

// 質問を送信
async function submitQuestion() {
    console.log('submitQuestion called');
    console.log('currentUser:', currentUser);
    console.log('window.demoAuth:', window.demoAuth);
    
    if (!currentUser) {
        console.error('currentUser is null');
        alert('ログインが必要です。スキップボタンでログインしてください。');
        showAuth();
        return;
    }

    const categoryEl = document.getElementById('question-category');
    const titleEl = document.getElementById('question-title');
    const textEl = document.getElementById('question-text');
    
    if (!categoryEl || !titleEl || !textEl) {
        console.error('質問フォームの要素が見つかりません');
        alert('フォームの読み込みに失敗しました。ページを再読み込みしてください。');
        return;
    }

    const category = categoryEl.value;
    const title = titleEl.value.trim();
    const text = textEl.value.trim();

    if (!category || !title || !text) {
        alert('すべての必須項目を入力してください');
        return;
    }

    try {
        console.log('質問データ:', { category, title, text: text.substring(0, 50) + '...' });
        
        let imageUrl = null;
        
        // 画像がある場合はDataURLとして保存
        if (questionImageFile) {
            console.log('画像を処理中...');
            const reader = new FileReader();
            imageUrl = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(questionImageFile);
            });
            console.log('画像処理完了');
        }

        // demoAuthが利用可能か確認
        if (!window.demoAuth) {
            console.error('window.demoAuth is not available');
            alert('システムエラーが発生しました。ページを再読み込みしてください。');
            return;
        }

        // 質問を作成
        console.log('質問を作成中...');
        const question = window.demoAuth.addQuestion({
            category: category,
            title: title,
            text: text,
            imageUrl: imageUrl,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            displayName: currentUser.displayName || currentUser.email
        });
        console.log('質問を作成しました:', question);

        // 管理者に通知（AI応答機能は省略）
        window.demoAuth.updateQuestion(question.id, {
            status: 'admin-notified',
            adminNotified: true
        });
        console.log('質問ステータスを更新しました');
        
        // 管理者に通知（デモモードではローカルストレージに保存）
        notifyAdmin(question);
        console.log('管理者に通知しました');

        // チャット画面に遷移
        console.log('チャット画面に遷移します。質問ID:', question.id);
        showChat(question.id);
        
    } catch (error) {
        console.error('質問送信エラー:', error);
        console.error('エラー詳細:', error.stack);
        alert('質問の送信に失敗しました: ' + (error.message || error));
    }
}

// AI判定（簡単な質問かどうか）
async function checkAIResponse(question) {
    // デモ用の簡単な判定ロジック
    // 実際の実装では、より高度なAI判定を使用
    
    const simpleKeywords = [
        '温度', '水やり', '肥料', '植え付け', '収穫時期',
        'いつ', 'どのくらい', '何度', '何回', '何日'
    ];
    
    const complexKeywords = [
        '病気', '枯れる', '変色', '異常', '問題',
        'どうすれば', 'なぜ', '原因', '対処'
    ];
    
    const text = question.text.toLowerCase();
    const hasSimpleKeywords = simpleKeywords.some(keyword => text.includes(keyword));
    const hasComplexKeywords = complexKeywords.some(keyword => text.includes(keyword));
    
    // 複雑なキーワードがある場合は管理者に通知
    if (hasComplexKeywords) {
        return { canAnswer: false, reason: 'complex' };
    }
    
    // 簡単なキーワードのみの場合はAI回答可能
    if (hasSimpleKeywords && !hasComplexKeywords) {
        return { canAnswer: true, reason: 'simple' };
    }
    
    // デフォルトは管理者に通知
    return { canAnswer: false, reason: 'default' };
}

// AI応答を生成
async function generateAIResponse(question) {
    // デモ用の簡単なAI応答
    // 実際の実装では、OpenAI APIや他のAIサービスを使用
    
    const categoryResponses = {
        'soil-preparation': 'いちごの土づくりは、排水性と保水性のバランスが重要です。pHは5.5～6.5が適切です。',
        'planting': '植え付けは9月～10月が適期です。株間は30cm程度、深植えにならないよう注意してください。',
        'watering': '水やりは土の表面が乾いたら行います。過湿にならないよう注意が必要です。',
        'fertilization': '元肥は植え付け時に、追肥は開花前と収穫中に行います。',
        'temperature': '生育適温は18～25℃です。夜温は10℃以上を保つと良いでしょう。',
        'lighting': '日当たりの良い場所で育てます。1日6時間以上の日照が理想です。',
        'pollination': '受粉は自然受粉または人工受粉で行います。ハチや風で受粉します。',
        'pruning': 'ランナーや古い葉は適宜剪定します。実がついたら余分な花は摘み取ります。',
        'pest-control': 'アブラムシやハダニに注意。早期発見と適切な薬剤散布が重要です。',
        'harvesting': '収穫は実が赤く熟したら行います。ヘタの部分まで赤くなったら収穫適期です。',
        'post-harvest': '収穫後は冷暗所で保管。早めに食べるか、冷凍保存も可能です。',
        'variety-selection': '品種選びは栽培環境と用途に合わせて選びます。',
        'facility-management': 'ハウス栽培では換気と温度管理が重要です。',
        'other': 'ご質問ありがとうございます。詳細な情報が必要な場合は、管理者にお問い合わせください。'
    };
    
    const baseResponse = categoryResponses[question.category] || 'ご質問ありがとうございます。';
    
    return `${baseResponse}\n\n※ この回答はAIによる一般的な情報です。具体的な状況については、管理者にご相談ください。`;
}

// 管理者に通知
function notifyAdmin(question) {
    // デモモードでは、管理者通知をローカルストレージに保存
    // 実際の実装では、管理者にメール通知やプッシュ通知を送信
    const notifications = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
    notifications.push({
        questionId: question.id,
        title: question.title,
        category: question.category,
        userId: question.userId,
        createdAt: new Date(),
        read: false
    });
    localStorage.setItem('admin_notifications', JSON.stringify(notifications));
}

// チャットメッセージを読み込む（質問用）
function loadChatMessages(questionId) {
    if (!questionId) {
        console.log('loadChatMessages: questionId is null');
        return;
    }
    
    console.log('loadChatMessages called with questionId:', questionId);
    
    const useDemoMode = !auth || !db || !window.firebaseAuth;
    
    if (useDemoMode) {
        const messages = window.demoAuth.getQuestionMessages(questionId);
        const question = window.demoAuth.getQuestionById(questionId);
        console.log('Messages:', messages);
        console.log('Question:', question);
        
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) {
            console.error('messages-container要素が見つかりません');
            return;
        }
        
        messagesContainer.innerHTML = '';
        
        // 質問の本文を最初のメッセージとして表示（タイトルと画像は上部に固定表示されているので、本文のみ）
        if (question) {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'message own';
            
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.textContent = question.text;
            bubble.appendChild(textDiv);
            
            questionDiv.appendChild(bubble);
            messagesContainer.appendChild(questionDiv);
        }
        
        // メッセージを表示
        messages.forEach((message) => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.userId === currentUser.uid ? 'own' : 'other'}`;

            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            
            if (message.isAI) {
                bubble.style.background = '#e8f5e9';
                bubble.style.borderLeft = '4px solid #4caf50';
            }
            
            if (message.imageUrl) {
                const img = document.createElement('img');
                img.src = message.imageUrl;
                img.className = 'message-image';
                img.alt = '画像';
                bubble.appendChild(img);
            }
            
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

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// 質問ヘッダーを表示（タイトルと画像を固定表示）
function displayQuestionHeader(question) {
    const questionHeader = document.getElementById('question-header');
    const questionHeaderTitle = document.getElementById('question-header-title');
    const questionHeaderImage = document.getElementById('question-header-image');
    
    if (!questionHeader || !questionHeaderTitle || !questionHeaderImage) {
        console.error('質問ヘッダーの要素が見つかりません');
        return;
    }
    
    // タイトルを設定
    questionHeaderTitle.textContent = `【${getCategoryName(question.category)}】${question.title}`;
    
    // 画像がある場合は表示
    if (question.imageUrl) {
        const img = document.createElement('img');
        img.src = question.imageUrl;
        img.className = 'question-header-image-content';
        img.alt = '質問画像';
        img.onclick = () => window.open(question.imageUrl, '_blank');
        questionHeaderImage.innerHTML = '';
        questionHeaderImage.appendChild(img);
    } else {
        questionHeaderImage.innerHTML = '';
    }
    
    // ヘッダーを表示
    questionHeader.style.display = 'block';
}

// 質問を解決済みにする
function resolveQuestion() {
    if (!currentQuestionId) {
        alert('質問が見つかりません');
        return;
    }
    
    if (!window.demoAuth) {
        alert('システムエラーが発生しました');
        return;
    }
    
    const question = window.demoAuth.getQuestionById(currentQuestionId);
    if (!question) {
        alert('質問が見つかりません');
        return;
    }
    
    // 確認ダイアログ
    if (!confirm('この質問を解決済みにしますか？\nチャットルームは閉じられますが、履歴から確認できます。')) {
        return;
    }
    
    try {
        // 質問のステータスを「解決済み」に更新
        window.demoAuth.updateQuestion(currentQuestionId, {
            status: 'resolved',
            resolvedAt: new Date()
        });
        
        // トップページに戻る
        showTopPage();
        
        alert('質問を解決済みにしました。履歴から確認できます。');
        
    } catch (error) {
        console.error('質問解決エラー:', error);
        alert('エラーが発生しました: ' + error.message);
    }
}

// カテゴリ名を取得
function getCategoryName(categoryValue) {
    const categories = {
        'soil-preparation': '土づくり・準備',
        'planting': '植え付け',
        'watering': '水やり',
        'fertilization': '施肥・肥料',
        'temperature': '温度管理',
        'lighting': '光管理',
        'pollination': '受粉',
        'pruning': '剪定・整枝',
        'pest-control': '病害虫対策',
        'harvesting': '収穫',
        'post-harvest': '収穫後処理',
        'variety-selection': '品種選び',
        'facility-management': '施設管理',
        'other': 'その他'
    };
    return categories[categoryValue] || 'その他';
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

    // デモモードかどうかを確認
    const useDemoMode = !auth || !db || !window.firebaseAuth;
    
    if (useDemoMode) {
        // デモモード: ローカルストレージに保存
        try {
            // 画像がある場合はDataURLとして保存
            if (selectedImageFile) {
                const reader = new FileReader();
                imageUrl = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(selectedImageFile);
                });
            }

            // 質問がある場合は質問のメッセージとして保存
            if (currentQuestionId) {
                window.demoAuth.addQuestionMessage(currentQuestionId, {
                    text: messageText || '',
                    imageUrl: imageUrl || null,
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    displayName: currentUser.displayName || currentUser.email
                });
                
                // フォームをクリア
                messageInput.value = '';
                cancelImageUpload();
                
                // メッセージを再読み込み
                loadChatMessages(currentQuestionId);
            } else {
                // 通常のメッセージを保存
                window.demoAuth.addMessage({
                    text: messageText || '',
                    imageUrl: imageUrl || null,
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    displayName: currentUser.displayName || currentUser.email
                });

                // フォームをクリア
                messageInput.value = '';
                cancelImageUpload();
                
                // メッセージを再読み込み
                loadMessages();
            }
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
            alert('メッセージの送信に失敗しました');
        }
        return;
    }

    // Firebaseモード
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
    // デモモードかどうかを確認
    const useDemoMode = !auth || !db || !window.firebaseAuth;
    
    if (useDemoMode) {
        // デモモード: ローカルストレージから読み込み
        const messages = window.demoAuth.getMessages();
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';

        messages.forEach((message) => {
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
        return;
    }

    // Firebaseモード
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

