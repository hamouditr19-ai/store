const TOKEN = '8222212068:AAH935nM61iSGrGGcXo_H2I6mB13Ws2QE74';
const CHAT_ID = '7741275208';

function sendOrder(category) {
    const text = `🚀 طلب جديد!\n━━━━━━━━━━━━\n👤 العميل: زائر\n📦 القسم: ${category}\n━━━━━━━━━━━━`;
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(text)}`;

    fetch(url).then(res => {
        if(res.ok) alert('✅ تم إرسال طلبك لقسم ' + category);
    });
}
