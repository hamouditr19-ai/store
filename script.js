// --- إعدادات شام كاش المحدثة ---
const WALLET_CODE = "17ac4a94cb1ed493e47a8526892294dd"; // الكود الخاص بك
const QR_IMAGE_URL = "https://raw.githubusercontent.com/YourRepo/main/58152.jpg"; // استبدل برابط صورتك المرفوعة

// --- دالة فتح نافذة الشحن المطورة ---
function showWallet() {
    const walletModalHTML = `
        <div id="walletModal" class="modal" style="display:flex;">
            <div class="modal-content" style="text-align:center;">
                <h3 style="color:var(--primary);"><i class="fas fa-wallet"></i> إيداع شام كاش</h3>
                <p style="font-size:12px; color:#aaa;">قم بمسح الباركود أو نسخ الكود أدناه للتحويل</p>
                
                <div style="background:white; padding:10px; border-radius:15px; display:inline-block; margin:10px 0;">
                    <img src="${QR_IMAGE_URL}" style="width:180px; height:180px;" alt="QR Code">
                </div>

                <div style="background:#0b1421; padding:12px; border-radius:10px; border:1px dashed var(--primary); margin-bottom:15px;">
                    <code id="walletAddr" style="font-size:10px; word-break:break-all; color:var(--primary);">${WALLET_CODE}</code>
                    <button onclick="copyWallet()" style="background:var(--primary); border:none; border-radius:5px; padding:3px 8px; margin-right:5px; cursor:pointer;">
                        <i class="fas fa-copy" style="color:#000;"></i>
                    </button>
                </div>

                <input type="number" id="depositAmount" placeholder="أدخل المبلغ المدفوع ($)">
                <input type="text" id="txnID" placeholder="رقم عملية الدفع (7-10 أرقام)">
                
                <button class="btn-action" onclick="confirmDeposit()">تأكيد الإيداع وإرسال الإشعار 🚀</button>
                <button class="btn-action" style="background:transparent; color:#888;" onclick="closeModals()">إلغاء</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', walletModalHTML);
}

// --- دالة نسخ الكود ---
function copyWallet() {
    navigator.clipboard.writeText(WALLET_CODE);
    showNotif("✅ تم نسخ كود المحفظة");
}

// --- دالة تأكيد الإيداع وإرسال للبوت ---
function confirmDeposit() {
    const amount = document.getElementById('depositAmount').value;
    const txn = document.getElementById('txnID').value;
    
    if(!amount || !txn) return alert("الرجاء إدخال المبلغ ورقم العملية");

    const message = `💰 *طلب شحن رصيد جديد*\n\n` +
                    `💵 المبلغ: ${amount}$\n` +
                    `🔢 رقم العملية: \`${txn}\`\n` +
                    `💳 الوسيلة: شام كاش\n` +
                    `✅ محفظة المستلم: \`${WALLET_CODE}\`\n` +
                    `⏰ الوقت: ${new Date().toLocaleString('ar-EG')}`;

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(message)}&parse_mode=Markdown`;

    fetch(url).then(res => {
        if(res.ok) {
            showNotif("✅ تم إرسال طلب الشحن للمراجعة");
            closeModals();
            // إزالة المودال من الـ DOM
            document.getElementById('walletModal').remove();
        }
    });
}
