// server.js (محدث مع إرسال الطلبات لتلجرام)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // <-- لإرسال الطلبات للبوت

const app = express();
app.use(cors());
app.use(express.json());

// ===== إعدادات بوت تلجرام =====
const TELEGRAM_BOT_TOKEN = '8222212068:AAH935nM61iSGrGGcXo_H2I6mB13Ws2QE74'; // استبدل هذا بالتوكن الحقيقي لبوتك
const TELEGRAM_CHAT_ID = '7741275208'; // استبدل بمعرف الدردشة الخاص بك

async function sendToTelegram(message) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('خطأ في إرسال رسالة تلجرام:', error);
    }
}

// الاتصال بقاعدة البيانات
mongoose.connect('mongodb://127.0.0.1:27017/remstore', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB متصل')).catch(err => console.log(err));

// نموذج المستخدم (مبسط)
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phone: String,
    balance: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

// ===== مسار الشراء (الذي سيرسل للبوت) =====
app.post('/api/purchase', async (req, res) => {
    try {
        const { userId, items, total, gameId } = req.body;

        // تحقق من الرصيد (يمكنك جلب المستخدم من قاعدة البيانات)
        // const user = await User.findById(userId);
        // if(user.balance < total) return res.status(400).json({ error: 'رصيد غير كافي' });

        // إنشاء رسالة التلجرام
        let message = `<b>🛒 طلب شراء جديد</b>\n\n`;
        message += `👤 <b>معرف المستخدم:</b> ${userId || 'غير محدد'}\n`;
        message += `🆔 <b>ID اللعبة/البرنامج:</b> ${gameId}\n`;
        message += `💰 <b>المجموع:</b> ${total} دولار سوري\n\n`;
        message += `<b>المنتجات:</b>\n`;
        items.forEach((item, index) => {
            message += `${index+1}. ${item.name} - ${item.price} SPL\n`;
        });

        // إرسال للبوت
        await sendToTelegram(message);

        // هنا يمكن خصم الرصيد وحفظ الطلب بقاعدة البيانات
        // user.balance -= total;
        // await user.save();

        res.json({ success: true, message: 'تم إرسال الطلب إلى المسؤول' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== مسار شحن الرصيد (مع رفع الصورة) =====
app.post('/api/wallet/charge', async (req, res) => {
    try {
        const { userId, amount, operationNumber } = req.body;
        // هنا يمكنك حفظ صورة الإشعار ومعالجتها

        let message = `<b>💰 طلب شحن رصيد</b>\n\n`;
        message += `👤 <b>المستخدم:</b> ${userId}\n`;
        message += `💵 <b>المبلغ:</b> ${amount} دولار سوري\n`;
        message += `🔢 <b>رقم العملية:</b> ${operationNumber}\n`;

        await sendToTelegram(message);
        res.json({ success: true, message: 'تم إرسال طلب الشحن' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// بدء السيرفر
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
