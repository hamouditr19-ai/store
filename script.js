const TELEGRAM_TOKEN =  8222212068:AAH935nM61iSGrGGcXo_H2I6mB13Ws2QE74 ;
const CHAT_ID =  7741275208 ;

function sendOrder(category) {
    const message = `طلب جديد من الموقع! \nالقسم: ${category}`;
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(message)}`;

    fetch(url)
    .then(response => {
        if(response.ok) {
            alert("تم استلام طلبك لـ " + category + " بنجاح!");
        }
    })
    .catch(error => console.error( خطأ: , error));
}
