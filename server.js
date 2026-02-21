// ===================================================
// ريم ستوري - المتجر الرقمي المتكامل v2.0
// النسخة النهائية الكاملة بكل الميزات
// ===================================================

const express = require( express );
const mongoose = require( mongoose );
const cors = require( cors );
const bcrypt = require( bcryptjs );
const jwt = require( jsonwebtoken );
const rateLimit = require( express-rate-limit );
const helmet = require( helmet );
const compression = require( compression );
const crypto = require( crypto );
const nodemailer = require( nodemailer );

const app = express();

// ========== الإعدادات الأمنية المتقدمة ==========
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors({
    origin: [ http://localhost:3000 ,  http://localhost:5500 ,  http://127.0.0.1:5500 ],
    credentials: true,
    methods: [ GET ,  POST ,  PUT ,  DELETE ,  OPTIONS ],
    allowedHeaders: [ Content-Type ,  Authorization ,  X-Requested-With ]
}));

app.use(express.json({ limit:  10mb  }));
app.use(express.urlencoded({ extended: true, limit:  10mb  }));

// ========== تحديد معدل الطلبات ==========
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // حد أقصى 100 طلب لكل IP
    message: { success: false, message:  طلبات كثيرة جداً، حاول بعد 15 دقيقة  }
});
app.use( /api/ , limiter);

// ========== الاتصال بقاعدة البيانات ==========
mongoose.connect( mongodb://127.0.0.1:27017/rem-store-pro , {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log( ✅ [DATABASE] قاعدة البيانات متصلة بنجاح ))
.catch(err => {
    console.error( ❌ [DATABASE] فشل الاتصال: , err.message);
    process.exit(1);
});

// ========== نماذج قاعدة البيانات المتقدمة ==========

// نموذج المستخدم الموسع
const UserSchema = new mongoose.Schema({
    name: { type: String, required: [true,  الاسم مطلوب ], trim: true },
    email: { 
        type: String, 
        required: [true,  البريد الإلكتروني مطلوب ], 
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,  بريد إلكتروني غير صالح ]
    },
    password: { type: String, required: [true,  كلمة المرور مطلوبة ], minlength: 6 },
    phone: { 
        type: String, 
        required: [true,  رقم الجوال مطلوب ],
        match: [/^05[0-9]{8}$/,  رقم جوال غير صالح ]
    },
    role: { 
        type: String, 
        enum: [ user ,  vip ,  reseller ,  admin ,  super_admin ],
        default:  user  
    },
    walletBalance: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: Date,
    loginCount: { type: Number, default: 0 },
    favoriteProducts: [{ type: mongoose.Schema.Types.ObjectId, ref:  Product  }],
    address: {
        street: String,
        city: String,
        state: String,
        country: { type: String, default:  SA  },
        zipCode: String
    },
    notifications: [{
        type: { type: String },
        message: String,
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// نموذج الفئة المتقدم
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    nameEn: String,
    description: String,
    icon: String,
    image: String,
    slug: { type: String, unique: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref:  Category  },
    level: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    metaTitle: String,
    metaDescription: String,
    productCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// نموذج المنتج المتقدم
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    nameEn: String,
    description: { type: String, required: true },
    descriptionEn: String,
    shortDescription: String,
    
    type: { 
        type: String, 
        enum: [
             GAME_CARD ,  MOBILE_BALANCE ,  SOFTWARE , 
             GIFT_CARD ,  VOUCHER ,  SUBSCRIPTION ,  DIGITAL_CODE 
        ],
        required: true 
    },
    
    category: { type: mongoose.Schema.Types.ObjectId, ref:  Category , required: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref:  Category  },
    
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, min: 0 },
    cost: { type: Number, min: 0 },
    profit: { type: Number, default: 0 },
    
    stockType: { 
        type: String, 
        enum: [ UNLIMITED ,  LIMITED ,  DIGITAL ,  SERIAL ],
        default:  DIGITAL  
    },
    
    stockQuantity: { type: Number, default: 0, min: 0 },
    
    digitalCodes: [{
        code: { type: String, required: true },
        serialNumber: String,
        isUsed: { type: Boolean, default: false },
        usedBy: { type: mongoose.Schema.Types.ObjectId, ref:  User  },
        usedAt: Date,
        orderId: { type: mongoose.Schema.Types.ObjectId, ref:  Order  },
        expiresAt: Date
    }],
    
    deliveryType: { 
        type: String, 
        enum: [ AUTO ,  MANUAL ,  API ,  EMAIL ,  SMS ],
        default:  AUTO  
    },
    
    images: [String],
    thumbnail: String,
    gallery: [String],
    
    specifications: {
        platform: [String],
        region: [String],
        language: [String],
        version: String,
        size: String,
        requirements: String
    },
    
    features: [String],
    
    seo: {
        title: String,
        description: String,
        keywords: [String],
        slug: { type: String, unique: true }
    },
    
    status: { 
        type: String, 
        enum: [ DRAFT ,  ACTIVE ,  INACTIVE ,  OUT_OF_STOCK ,  COMING_SOON ],
        default:  ACTIVE  
    },
    
    featured: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    
    views: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    
    minQuantity: { type: Number, default: 1 },
    maxQuantity: { type: Number, default: 10 },
    
    tags: [String],
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// نموذج الطلب المتقدم
const OrderSchema = new mongoose.Schema({
    orderNumber: { type: String, unique: true, required: true },
    
    user: { type: mongoose.Schema.Types.ObjectId, ref:  User , required: true },
    
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref:  Product , required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        total: { type: Number, required: true },
        deliveredCodes: [String],
        deliveredAt: Date,
        isDelivered: { type: Boolean, default: false }
    }],
    
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: String,
    couponCode: String,
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    total: { type: Number, required: true },
    
    paymentMethod: { 
        type: String, 
        enum: [ WALLET ,  CREDIT_CARD ,  MADA ,  STC_PAY ,  APPLE_PAY ,  BANK_TRANSFER ,  CASH ],
        required: true 
    },
    
    paymentStatus: { 
        type: String, 
        enum: [ PENDING ,  PAID ,  FAILED ,  REFUNDED ,  PARTIALLY_REFUNDED ],
        default:  PENDING  
    },
    
    paymentId: String,
    paymentDetails: mongoose.Schema.Types.Mixed,
    
    deliveryStatus: { 
        type: String, 
        enum: [ PENDING ,  PROCESSING ,  DELIVERED ,  FAILED ,  MANUAL ],
        default:  PENDING  
    },
    
    deliveryDetails: mongoose.Schema.Types.Mixed,
    
    notes: String,
    adminNotes: String,
    
    ipAddress: String,
    userAgent: String,
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    completedAt: Date,
    cancelledAt: Date,
    cancelledReason: String
});

// نموذج المعاملات المالية
const TransactionSchema = new mongoose.Schema({
    transactionNumber: { type: String, unique: true },
    
    user: { type: mongoose.Schema.Types.ObjectId, ref:  User , required: true },
    
    type: { 
        type: String, 
        enum: [
             DEPOSIT ,  WITHDRAWAL ,  PURCHASE ,  REFUND , 
             COMMISSION ,  BONUS ,  TRANSFER ,  FEE 
        ],
        required: true 
    },
    
    amount: { type: Number, required: true },
    currency: { type: String, default:  SAR  },
    
    status: { 
        type: String, 
        enum: [ PENDING ,  COMPLETED ,  FAILED ,  CANCELLED ],
        default:  PENDING  
    },
    
    paymentMethod: String,
    paymentReference: String,
    
    order: { type: mongoose.Schema.Types.ObjectId, ref:  Order  },
    
    description: String,
    
    balanceBefore: Number,
    balanceAfter: Number,
    
    metadata: mongoose.Schema.Types.Mixed,
    
    createdAt: { type: Date, default: Date.now },
    completedAt: Date
});

// نموذج المحفظة
const WalletSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref:  User , required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default:  SAR  },
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    totalDeposited: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastTransaction: Date,
    isFrozen: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// نموذج الكوبون المتقدم
const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: String,
    description: String,
    
    discountType: { type: String, enum: [ PERCENTAGE ,  FIXED ], required: true },
    discountValue: { type: Number, required: true },
    
    minOrderAmount: Number,
    maxDiscount: Number,
    
    usageLimit: Number,
    usageCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref:  Product  }],
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref:  Category  }],
    applicableUsers: [{ type: mongoose.Schema.Types.ObjectId, ref:  User  }],
    
    isActive: { type: Boolean, default: true },
    isFirstOrderOnly: { type: Boolean, default: false },
    isNewUsersOnly: { type: Boolean, default: false },
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref:  User  },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// نموذج التقييم المتقدم
const ReviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref:  User , required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref:  Product , required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref:  Order  },
    
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    comment: String,
    
    pros: [String],
    cons: [String],
    
    images: [String],
    video: String,
    
    isVerified: { type: Boolean, default: false },
    isRecommended: { type: Boolean, default: true },
    
    status: { 
        type: String, 
        enum: [ PENDING ,  APPROVED ,  REJECTED ,  FLAGGED ],
        default:  PENDING  
    },
    
    helpful: { type: Number, default: 0 },
    notHelpful: { type: Number, default: 0 },
    
    reported: { type: Boolean, default: false },
    reportReason: String,
    
    adminReply: {
        message: String,
        repliedBy: { type: mongoose.Schema.Types.ObjectId, ref:  User  },
        repliedAt: Date
    },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// نموذج الإشعارات المتقدم
const NotificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref:  User , required: true },
    
    type: { 
        type: String, 
        enum: [
             ORDER_CONFIRMED ,  ORDER_DELIVERED ,  ORDER_CANCELLED ,
             PAYMENT_RECEIVED ,  PAYMENT_FAILED ,
             WALLET_CREDITED ,  WALLET_DEBITED ,
             PROMOTION ,  SYSTEM ,  REMINDER ,
             PRODUCT_UPDATE ,  PRICE_DROP ,  BACK_IN_STOCK 
        ],
        required: true 
    },
    
    title: { type: String, required: true },
    message: { type: String, required: true },
    
    data: mongoose.Schema.Types.Mixed,
    
    priority: { type: String, enum: [ LOW ,  MEDIUM ,  HIGH ,  URGENT ], default:  MEDIUM  },
    
    isRead: { type: Boolean, default: false },
    readAt: Date,
    
    isDelivered: { type: Boolean, default: false },
    deliveredAt: Date,
    
    actionUrl: String,
    actionText: String,
    
    image: String,
    
    expiresAt: Date,
    
    createdAt: { type: Date, default: Date.now }
});

// نموذج سلة التسوق المؤقتة
const CartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref:  User , required: true, unique: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref:  Product , required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: Number,
        addedAt: { type: Date, default: Date.now }
    }],
    couponCode: String,
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    expiresAt: { type: Date, default: () => new Date(+new Date() + 7*24*60*60*1000) },
    updatedAt: { type: Date, default: Date.now }
});

// إنشاء النماذج
const User = mongoose.model( User , UserSchema);
const Category = mongoose.model( Category , CategorySchema);
const Product = mongoose.model( Product , ProductSchema);
const Order = mongoose.model( Order , OrderSchema);
const Transaction = mongoose.model( Transaction , TransactionSchema);
const Wallet = mongoose.model( Wallet , WalletSchema);
const Coupon = mongoose.model( Coupon , CouponSchema);
const Review = mongoose.model( Review , ReviewSchema);
const Notification = mongoose.model( Notification , NotificationSchema);
const Cart = mongoose.model( Cart , CartSchema);

// ========== Middleware التحقق من التوكن ==========
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers[ authorization ];
        const token = authHeader && authHeader.split(   )[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message:  لا يوجد توكن صلاحية  
            });
        }
        
        const decoded = jwt.verify(token,  rem-store-super-secret-key-2024 );
        const user = await User.findById(decoded.id).select( -password );
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message:  المستخدم غير موجود  
            });
        }
        
        if (!user.isActive) {
            return res.status(403).json({ 
                success: false, 
                message:  الحساب معطل  
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        if (error.name ===  JsonWebTokenError ) {
            return res.status(403).json({ 
                success: false, 
                message:  توكن غير صالح  
            });
        }
        if (error.name ===  TokenExpiredError ) {
            return res.status(401).json({ 
                success: false, 
                message:  انتهت صلاحية التوكن  
            });
        }
        return res.status(500).json({ 
            success: false, 
            message:  خطأ في التحقق من التوكن  
        });
    }
};

// Middleware التحقق من الأدمن
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message:  غير مصرح  
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message:  ليس لديك صلاحية لهذا الإجراء  
            });
        }
        
        next();
    };
};

// ========== دوال مساعدة متقدمة ==========

// توليد رقم طلب فريد
const generateOrderNumber = () => {
    const prefix =  REM ;
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sequence = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${timestamp}-${random}-${sequence}`;
};

// توليد رقم معاملة فريد
const generateTransactionNumber = () => {
    const prefix =  TXN ;
    const date = new Date().toISOString().slice(0,10).replace(/-/g,  );
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${prefix}${date}${random}`;
};

// توليد كود تحقق
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// توليد رمز عشوائي
const generateRandomToken = (length = 32) => {
    return crypto.randomBytes(length).toString( hex );
};

// حساب الربح
const calculateProfit = (price, cost) => {
    return price - (cost || 0);
};

// تحديث إحصائيات المنتج
const updateProductStats = async (productId) => {
    try {
        const product = await Product.findById(productId);
        if (!product) return;
        
        const reviews = await Review.find({ 
            product: productId, 
            status:  APPROVED  
        });
        
        if (reviews.length > 0) {
            const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
            product.rating = totalRating / reviews.length;
            product.reviewsCount = reviews.length;
        }
        
        await product.save();
    } catch (error) {
        console.error( خطأ في تحديث إحصائيات المنتج: , error);
    }
};

// ========== مسارات API المتقدمة ==========

// ----------------------------------------------
// 1. مسارات المصادقة المتقدمة
// ----------------------------------------------

// تسجيل مستخدم جديد
app.post( /api/v1/auth/register , async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        // التحقق من المدخلات
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ 
                success: false, 
                message:  جميع الحقول مطلوبة  
            });
        }
        
        // التحقق من صحة البريد
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message:  بريد إلكتروني غير صالح  
            });
        }
        
        // التحقق من صحة رقم الجوال
        const phoneRegex = /^05[0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ 
                success: false, 
                message:  رقم جوال غير صالح (يجب أن يبدأ بـ 05 ويتكون من 10 أرقام)  
            });
        }
        
        // التحقق من وجود المستخدم
        const existingUser = await User.findOne({ 
            $or: [{ email }, { phone }] 
        });
        
        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(400).json({ 
                    success: false, 
                    message:  البريد الإلكتروني مستخدم مسبقاً  
                });
            }
            if (existingUser.phone === phone) {
                return res.status(400).json({ 
                    success: false, 
                    message:  رقم الجوال مستخدم مسبقاً  
                });
            }
        }
        
        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // إنشاء مستخدم جديد
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone,
            verificationToken: generateVerificationCode(),
            lastLogin: new Date(),
            loginCount: 1
        });
        
        // إنشاء محفظة للمستخدم
        await Wallet.create({
            user: user._id,
            balance: 0,
            currency:  SAR 
        });
        
        // إنشاء توكن
        const token = jwt.sign(
            { 
                id: user._id, 
                email: user.email, 
                role: user.role 
            },
             rem-store-super-secret-key-2024 ,
            { expiresIn:  30d  }
        );
        
        // إرسال إشعار ترحيبي
        await Notification.create({
            user: user._id,
            type:  SYSTEM ,
            title:  مرحباً بك في ريم ستوري ,
            message:  شكراً لانضمامك إلينا! استمتع بتجربة التسوق ,
            priority:  MEDIUM 
        });
        
        res.status(201).json({
            success: true,
            message:  تم إنشاء الحساب بنجاح ,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                walletBalance: 0,
                isVerified: user.isVerified
            }
        });
        
    } catch (error) {
        console.error( خطأ في التسجيل: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في إنشاء الحساب  
        });
    }
});

// تسجيل الدخول
app.post( /api/v1/auth/login , async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message:  البريد الإلكتروني وكلمة المرور مطلوبان  
            });
        }
        
        // البحث عن المستخدم
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message:  بيانات الدخول غير صحيحة  
            });
        }
        
        // التحقق من تفعيل الحساب
        if (!user.isActive) {
            return res.status(403).json({ 
                success: false, 
                message:  الحساب معطل، تواصل مع الدعم  
            });
        }
        
        // التحقق من كلمة المرور
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message:  بيانات الدخول غير صحيحة  
            });
        }
        
        // تحديث معلومات الدخول
        user.lastLogin = new Date();
        user.loginCount += 1;
        await user.save();
        
        // جلب رصيد المحفظة
        const wallet = await Wallet.findOne({ user: user._id });
        
        // إنشاء توكن
        const token = jwt.sign(
            { 
                id: user._id, 
                email: user.email, 
                role: user.role 
            },
             rem-store-super-secret-key-2024 ,
            { expiresIn:  30d  }
        );
        
        res.json({
            success: true,
            message:  تم تسجيل الدخول بنجاح ,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                walletBalance: wallet ? wallet.balance : 0,
                isVerified: user.isVerified
            }
        });
        
    } catch (error) {
        console.error( خطأ في تسجيل الدخول: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في تسجيل الدخول  
        });
    }
});

// الحصول على بيانات المستخدم الحالي
app.get( /api/v1/auth/me , authenticateToken, async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ user: req.user._id });
        
        res.json({
            success: true,
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                phone: req.user.phone,
                role: req.user.role,
                walletBalance: wallet ? wallet.balance : 0,
                isVerified: req.user.isVerified,
                createdAt: req.user.createdAt,
                lastLogin: req.user.lastLogin,
                totalOrders: req.user.totalOrders,
                totalSpent: req.user.totalSpent
            }
        });
    } catch (error) {
        console.error( خطأ في جلب بيانات المستخدم: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في جلب البيانات  
        });
    }
});

// ----------------------------------------------
// 2. مسارات المنتجات المتقدمة
// ----------------------------------------------

// جلب جميع المنتجات مع فلترة متقدمة
app.get( /api/v1/products , async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            type,
            search,
            sort,
            minPrice,
            maxPrice,
            featured,
            bestSeller,
            inStock,
            rating,
            tags
        } = req.query;
        
        // بناء فلتر البحث
        const filter = { status:  ACTIVE  };
        
        if (category) {
            filter.category = category;
        }
        
        if (type) {
            filter.type = type;
        }
        
        if (featured ===  true ) {
            filter.featured = true;
        }
        
        if (bestSeller ===  true ) {
            filter.bestSeller = true;
        }
        
        if (inStock ===  true ) {
            filter.$or = [
                { stockType:  UNLIMITED  },
                { stockQuantity: { $gt: 0 } }
            ];
        }
        
        if (rating) {
            filter.rating = { $gte: parseFloat(rating) };
        }
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options:  i  } },
                { nameEn: { $regex: search, $options:  i  } },
                { description: { $regex: search, $options:  i  } },
                { tags: { $in: [new RegExp(search,  i )] } }
            ];
        }
        
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }
        
        if (tags) {
            const tagArray = tags.split( , );
            filter.tags = { $in: tagArray };
        }
        
        // بناء الترتيب
        let sortOption = { createdAt: -1 };
        switch (sort) {
            case  price_asc :
                sortOption = { price: 1 };
                break;
            case  price_desc :
                sortOption = { price: -1 };
                break;
            case  popular :
                sortOption = { sales: -1 };
                break;
            case  rating :
                sortOption = { rating: -1 };
                break;
            case  newest :
                sortOption = { createdAt: -1 };
                break;
            case  name_asc :
                sortOption = { name: 1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }
        
        // تنفيذ الاستعلام مع الـ populate
        const products = await Product.find(filter)
            .populate( category ,  name slug )
            .populate( subCategory ,  name )
            .sort(sortOption)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();
        
        // إخفاء الأكواد الغير مستخدمة
        products.forEach(product => {
            if (product.digitalCodes) {
                product.digitalCodes = product.digitalCodes.filter(c => !c.isUsed).length;
            }
        });
        
        const total = await Product.countDocuments(filter);
        
        res.json({
            success: true,
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
                hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
                hasPrev: parseInt(page) > 1
            },
            filters: {
                categories: await Category.find({ isActive: true }).select( name slug ),
                types: Product.schema.path( type ).enumValues
            }
        });
        
    } catch (error) {
        console.error( خطأ في جلب المنتجات: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في جلب المنتجات  
        });
    }
});

// جلب منتج واحد مع التفاصيل الكاملة
app.get( /api/v1/products/:id , async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate( category )
            .populate( subCategory )
            .lean();
        
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message:  المنتج غير موجود  
            });
        }
        
        // زيادة عدد المشاهدات
        await Product.findByIdAndUpdate(req.params.id, {
            $inc: { views: 1 }
        });
        
        // إخفاء الأكواد المستخدمة
        const availableCodes = product.digitalCodes?.filter(c => !c.isUsed) || [];
        product.availableCodes = availableCodes.length;
        delete product.digitalCodes;
        
        // جلب التقييمات
        const reviews = await Review.find({ 
            product: product._id, 
            status:  APPROVED  
        })
        .populate( user ,  name )
        .sort({ createdAt: -1 })
        .limit(10);
        
        // جلب منتجات مشابهة
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            status:  ACTIVE 
        })
        .limit(4)
        .select( name price thumbnail rating )
        .lean();
        
        res.json({
            success: true,
            product: {
                ...product,
                reviews,
                relatedProducts
            }
        });
        
    } catch (error) {
        console.error( خطأ في جلب المنتج: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في جلب المنتج  
        });
    }
});

// جلب الفئات
app.get( /api/v1/categories , async (req, res) => {
    try {
        const categories = await Category.find({ 
            isActive: true,
            level: 0 
        })
        .sort({ order: 1 })
        .lean();
        
        // جلب الفئات الفرعية
        for (let category of categories) {
            category.subCategories = await Category.find({
                parent: category._id,
                isActive: true
            }).sort({ order: 1 });
            
            // عدد المنتجات في كل فئة
            category.productCount = await Product.countDocuments({
                category: category._id,
                status:  ACTIVE 
            });
        }
        
        res.json({
            success: true,
            categories
        });
        
    } catch (error) {
        console.error( خطأ في جلب الفئات: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في جلب الفئات  
        });
    }
});

// ----------------------------------------------
// 3. مسارات السلة والطلبات
// ----------------------------------------------

// إضافة إلى السلة
app.post( /api/v1/cart/add , authenticateToken, async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        
        const product = await Product.findById(productId);
        if (!product || product.status !==  ACTIVE ) {
            return res.status(404).json({ 
                success: false, 
                message:  المنتج غير متوفر  
            });
        }
        
        // التحقق من الكمية
        if (quantity < product.minQuantity || quantity > product.maxQuantity) {
            return res.status(400).json({ 
                success: false, 
                message: `الكمية المسموحة من ${product.minQuantity} إلى ${product.maxQuantity}` 
            });
        }
        
        let cart = await Cart.findOne({ user: req.user._id });
        
        if (!cart) {
            cart = await Cart.create({
                user: req.user._id,
                items: []
            });
        }
        
        // التحقق من وجود المنتج في السلة
        const existingItem = cart.items.find(item => 
            item.product.toString() === productId
        );
        
        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > product.maxQuantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `لا يمكن إضافة أكثر من ${product.maxQuantity} من هذا المنتج` 
                });
            }
            existingItem.quantity = newQuantity;
        } else {
            cart.items.push({
                product: productId,
                quantity,
                price: product.price
            });
        }
        
        await cart.save();
        
        // تحديث إجمالي السلة
        cart.total = cart.items.reduce((sum, item) => 
            sum + (item.price * item.quantity), 0
        );
        
        await cart.save();
        
        res.json({
            success: true,
            message:  تمت الإضافة إلى السلة ,
            cart
        });
        
    } catch (error) {
        console.error( خطأ في إضافة للسلة: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في الإضافة للسلة  
        });
    }
});

// جلب السلة
app.get( /api/v1/cart , authenticateToken, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id })
            .populate( items.product );
        
        if (!cart) {
            return res.json({
                success: true,
                cart: {
                    items: [],
                    total: 0
                }
            });
        }
        
        res.json({
            success: true,
            cart
        });
        
    } catch (error) {
        console.error( خطأ في جلب السلة: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في جلب السلة  
        });
    }
});

// إنشاء طلب جديد
app.post( /api/v1/orders , authenticateToken, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { paymentMethod, couponCode, notes } = req.body;
        
        // جلب السلة
        const cart = await Cart.findOne({ user: req.user._id })
            .populate( items.product );
        
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message:  السلة فارغة  
            });
        }
        
        let subtotal = 0;
        const orderItems = [];
        let totalDiscount = 0;
        
        // معالجة كل منتج
        for (const item of cart.items) {
            const product = item.product;
            
            // التحقق من توفر المنتج
            if (product.status !==  ACTIVE ) {
                throw new Error(`المنتج ${product.name} غير متوفر`);
            }
            
            // التحقق من المخزون
            if (product.stockType ===  DIGITAL ) {
                const availableCodes = product.digitalCodes.filter(c => !c.isUsed);
                if (availableCodes.length < item.quantity) {
                    throw new Error(`المنتج ${product.name} غير متوفر بالكمية المطلوبة`);
                }
            } else if (product.stockType ===  LIMITED ) {
                if (product.stockQuantity < item.quantity) {
                    throw new Error(`المنتج ${product.name} غير متوفر بالكمية المطلوبة`);
                }
            }
            
            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;
            
            orderItems.push({
                product: product._id,
                name: product.name,
                quantity: item.quantity,
                price: product.price,
                total: itemTotal
            });
        }
        
        // تطبيق الكوبون
        if (couponCode) {
            const coupon = await Coupon.findOne({
                code: couponCode,
                isActive: true,
                startDate: { $lte: new Date() },
                $or: [
                    { endDate: { $gte: new Date() } },
                    { endDate: null }
                ]
            });
            
            if (coupon && (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit)) {
                if (coupon.discountType ===  PERCENTAGE ) {
                    totalDiscount = subtotal * (coupon.discountValue / 100);
                    if (coupon.maxDiscount && totalDiscount > coupon.maxDiscount) {
                        totalDiscount = coupon.maxDiscount;
                    }
                } else {
                    totalDiscount = coupon.discountValue;
                }
                
                coupon.usageCount += 1;
                await coupon.save({ session });
            }
        }
        
        const total = subtotal - totalDiscount;
        
        // التحقق من الرصيد
        if (paymentMethod ===  WALLET ) {
            const wallet = await Wallet.findOne({ user: req.user._id });
            if (!wallet || wallet.balance < total) {
                throw new Error( رصيد غير كافي في المحفظة );
            }
            
            wallet.balance -= total;
            await wallet.save({ session });
        }
        
        // إنشاء الطلب
        const orderNumber = generateOrderNumber();
        const order = await Order.create([{
            orderNumber,
            user: req.user._id,
            items: orderItems,
            subtotal,
            discount: totalDiscount,
            couponCode,
            total,
            paymentMethod,
            paymentStatus: paymentMethod ===  WALLET  ?  PAID  :  PENDING ,
            deliveryStatus:  PENDING ,
            notes,
            ipAddress: req.ip,
            userAgent: req.headers[ user-agent ]
        }], { session });
        
        // معالجة المنتجات الرقمية والتسليم الفوري
        for (const item of orderItems) {
            const product = await Product.findById(item.product).session(session);
            
            if (product.stockType ===  DIGITAL ) {
                const availableCodes = product.digitalCodes.filter(c => !c.isUsed);
                const deliveredCodes = [];
                
                for (let i = 0; i < item.quantity; i++) {
                    const codeObj = availableCodes[i];
                    codeObj.isUsed = true;
                    codeObj.usedBy = req.user._id;
                    codeObj.usedAt = new Date();
                    codeObj.orderId = order[0]._id;
                    deliveredCodes.push(codeObj.code);
                }
                
                // تحديث المنتج
                await product.save({ session });
                
                // تحديث عنصر الطلب بالأكواد المسلمة
                const orderItem = order[0].items.find(i => 
                    i.product.toString() === item.product.toString()
                );
                if (orderItem) {
                    orderItem.deliveredCodes = deliveredCodes;
                    orderItem.isDelivered = true;
                    orderItem.deliveredAt = new Date();
                }
            } else if (product.stockType ===  LIMITED ) {
                product.stockQuantity -= item.quantity;
                await product.save({ session });
            }
            
            // تحديث إحصائيات المنتج
            product.sales += item.quantity;
            product.revenue += item.total;
            await product.save({ session });
        }
        
        await order[0].save({ session });
        
        // إنشاء معاملة مالية
        await Transaction.create([{
            transactionNumber: generateTransactionNumber(),
            user: req.user._id,
            type:  PURCHASE ,
            amount: total,
            currency:  SAR ,
            status:  COMPLETED ,
            paymentMethod,
            order: order[0]._id,
            description: `شراء طلب رقم ${orderNumber}`,
            balanceBefore: req.user.walletBalance + total,
            balanceAfter: req.user.walletBalance
        }], { session });
        
        // تحديث إحصائيات المستخدم
        req.user.totalOrders += 1;
        req.user.totalSpent += total;
        await req.user.save({ session });
        
        // إفراغ السلة
        await Cart.findOneAndDelete({ user: req.user._id }, { session });
        
        // إنشاء إشعار
        await Notification.create([{
            user: req.user._id,
            type:  ORDER_CONFIRMED ,
            title:  تم تأكيد الطلب ,
            message: `طلب رقم ${orderNumber} قيد التنفيذ`,
            data: { orderId: order[0]._id },
            priority:  HIGH 
        }], { session });
        
        await session.commitTransaction();
        
        res.status(201).json({
            success: true,
            message:  تم إنشاء الطلب بنجاح ,
            order: order[0]
        });
        
    } catch (error) {
        await session.abortTransaction();
        console.error( خطأ في إنشاء الطلب: , error);
        res.status(500).json({ 
            success: false, 
            message: error.message ||  حدث خطأ في إنشاء الطلب  
        });
    } finally {
        session.endSession();
    }
});

// جلب طلبات المستخدم
app.get( /api/v1/orders/my-orders , authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate( items.product ,  name thumbnail )
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            orders
        });
        
    } catch (error) {
        console.error( خطأ في جلب الطلبات: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في جلب الطلبات  
        });
    }
});

// ----------------------------------------------
// 4. مسارات المحفظة
// ----------------------------------------------

// جلب رصيد المحفظة
app.get( /api/v1/wallet , authenticateToken, async (req, res) => {
    try {
        let wallet = await Wallet.findOne({ user: req.user._id });
        
        if (!wallet) {
            wallet = await Wallet.create({
                user: req.user._id,
                balance: 0,
                currency:  SAR 
            });
        }
        
        // جلب آخر المعاملات
        const transactions = await Transaction.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        
        res.json({
            success: true,
            wallet: {
                balance: wallet.balance,
                currency: wallet.currency,
                points: wallet.points,
                level: wallet.level,
                totalDeposited: wallet.totalDeposited,
                totalSpent: wallet.totalSpent
            },
            transactions
        });
        
    } catch (error) {
        console.error( خطأ في جلب المحفظة: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في جلب المحفظة  
        });
    }
});

// إيداع في المحفظة
app.post( /api/v1/wallet/deposit , authenticateToken, async (req, res) => {
    try {
        const { amount, paymentMethod } = req.body;
        
        if (amount < 10) {
            return res.status(400).json({ 
                success: false, 
                message:  الحد الأدنى للإيداع 10 ريال  
            });
        }
        
        const wallet = await Wallet.findOne({ user: req.user._id });
        
        if (!wallet) {
            return res.status(404).json({ 
                success: false, 
                message:  المحفظة غير موجودة  
            });
        }
        
        // هنا يتم التكامل مع بوابة الدفع الفعلية
        
        const oldBalance = wallet.balance;
        wallet.balance += amount;
        wallet.totalDeposited += amount;
        await wallet.save();
        
        // إنشاء معاملة
        const transaction = await Transaction.create({
            transactionNumber: generateTransactionNumber(),
            user: req.user._id,
            type:  DEPOSIT ,
            amount,
            currency:  SAR ,
            status:  COMPLETED ,
            paymentMethod,
            description:  إيداع في المحفظة ,
            balanceBefore: oldBalance,
            balanceAfter: wallet.balance
        });
        
        // إشعار
        await Notification.create({
            user: req.user._id,
            type:  WALLET_CREDITED ,
            title:  تم إيداع المبلغ ,
            message: `تم إضافة ${amount} ريال إلى محفظتك`,
            data: { amount, balance: wallet.balance }
        });
        
        res.json({
            success: true,
            message:  تم الإيداع بنجاح ,
            balance: wallet.balance,
            transaction
        });
        
    } catch (error) {
        console.error( خطأ في الإيداع: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في الإيداع  
        });
    }
});

// ----------------------------------------------
// 5. مسارات الإشعارات
// ----------------------------------------------

// جلب الإشعارات
app.get( /api/v1/notifications , authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        
        const unreadCount = await Notification.countDocuments({
            user: req.user._id,
            isRead: false
        });
        
        res.json({
            success: true,
            notifications,
            unreadCount
        });
        
    } catch (error) {
        console.error( خطأ في جلب الإشعارات: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في جلب الإشعارات  
        });
    }
});

// تحديث إشعار كمقروء
app.put( /api/v1/notifications/:id/read , authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { 
                _id: req.params.id, 
                user: req.user._id 
            },
            { 
                isRead: true, 
                readAt: new Date() 
            },
            { new: true }
        );
        
        if (!notification) {
            return res.status(404).json({ 
                success: false, 
                message:  الإشعار غير موجود  
            });
        }
        
        res.json({
            success: true,
            notification
        });
        
    } catch (error) {
        console.error( خطأ في تحديث الإشعار: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في تحديث الإشعار  
        });
    }
});

// ----------------------------------------------
// 6. مسارات لوحة التحكم (للمسؤول)
// ----------------------------------------------

// إحصائيات لوحة التحكم
app.get( /api/v1/admin/stats , authenticateToken, authorize( admin ,  super_admin ), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const [
            totalUsers,
            newUsersToday,
            totalProducts,
            totalOrders,
            ordersToday,
            totalRevenue,
            revenueToday,
            pendingOrders,
            lowStockProducts
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: today } }),
            Product.countDocuments(),
            Order.countDocuments(),
            Order.countDocuments({ createdAt: { $gte: today } }),
            Order.aggregate([
                { $match: { paymentStatus:  PAID  } },
                { $group: { _id: null, total: { $sum:  $total  } } }
            ]),
            Order.aggregate([
                { $match: { 
                    paymentStatus:  PAID ,
                    createdAt: { $gte: today }
                }},
                { $group: { _id: null, total: { $sum:  $total  } } }
            ]),
            Order.countDocuments({ paymentStatus:  PENDING  }),
            Product.countDocuments({ 
                stockType:  LIMITED ,
                stockQuantity: { $lt: 10 }
            })
        ]);
        
        res.json({
            success: true,
            stats: {
                users: {
                    total: totalUsers,
                    newToday: newUsersToday
                },
                products: {
                    total: totalProducts,
                    lowStock: lowStockProducts
                },
                orders: {
                    total: totalOrders,
                    today: ordersToday,
                    pending: pendingOrders
                },
                revenue: {
                    total: totalRevenue[0]?.total || 0,
                    today: revenueToday[0]?.total || 0
                }
            }
        });
        
    } catch (error) {
        console.error( خطأ في جلب الإحصائيات: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في جلب الإحصائيات  
        });
    }
});

// إضافة منتج (للمسؤول)
app.post( /api/v1/admin/products , authenticateToken, authorize( admin ,  super_admin ), async (req, res) => {
    try {
        const productData = req.body;
        
        // إنشاء slug
        if (!productData.seo?.slug) {
            productData.seo = productData.seo || {};
            productData.seo.slug = productData.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g,  - )
                .replace(/(^-|-$)/g,   );
        }
        
        // حساب الربح
        if (productData.price && productData.cost) {
            productData.profit = productData.price - productData.cost;
        }
        
        const product = await Product.create(productData);
        
        // تحديث عدد المنتجات في الفئة
        await Category.findByIdAndUpdate(productData.category, {
            $inc: { productCount: 1 }
        });
        
        res.status(201).json({
            success: true,
            message:  تم إضافة المنتج بنجاح ,
            product
        });
        
    } catch (error) {
        console.error( خطأ في إضافة المنتج: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في إضافة المنتج  
        });
    }
});

// إضافة أكواد رقمية
app.post( /api/v1/admin/products/:id/codes , authenticateToken, authorize( admin ,  super_admin ), async (req, res) => {
    try {
        const { codes } = req.body;
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message:  المنتج غير موجود  
            });
        }
        
        const newCodes = codes.map(code => ({
            code: code.code || code,
            serialNumber: code.serialNumber,
            expiresAt: code.expiresAt
        }));
        
        product.digitalCodes.push(...newCodes);
        product.stockQuantity += newCodes.length;
        await product.save();
        
        res.json({
            success: true,
            message: `تم إضافة ${newCodes.length} كود بنجاح`,
            product: {
                id: product._id,
                name: product.name,
                stockQuantity: product.stockQuantity,
                codesCount: product.digitalCodes.length,
                availableCodes: product.digitalCodes.filter(c => !c.isUsed).length
            }
        });
        
    } catch (error) {
        console.error( خطأ في إضافة الأكواد: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في إضافة الأكواد  
        });
    }
});

// جلب جميع الطلبات (للمسؤول)
app.get( /api/v1/admin/orders , authenticateToken, authorize( admin ,  super_admin ), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        const filter = {};
        if (status) filter.paymentStatus = status;
        
        const orders = await Order.find(filter)
            .populate( user ,  name email phone )
            .populate( items.product ,  name thumbnail )
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        
        const total = await Order.countDocuments(filter);
        
        res.json({
            success: true,
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error( خطأ في جلب الطلبات: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في جلب الطلبات  
        });
    }
});

// جلب جميع المستخدمين (للمسؤول)
app.get( /api/v1/admin/users , authenticateToken, authorize( admin ,  super_admin ), async (req, res) => {
    try {
        const users = await User.find()
            .select( -password )
            .sort({ createdAt: -1 });
        
        // جلب محافظ المستخدمين
        const usersWithWallet = await Promise.all(
            users.map(async (user) => {
                const wallet = await Wallet.findOne({ user: user._id });
                return {
                    ...user.toObject(),
                    walletBalance: wallet ? wallet.balance : 0
                };
            })
        );
        
        res.json({
            success: true,
            users: usersWithWallet
        });
        
    } catch (error) {
        console.error( خطأ في جلب المستخدمين: , error);
        res.status(500).json({ 
            success: false, 
            message:  حدث خطأ في جلب المستخدمين  
        });
    }
});

// ========== إنشاء بيانات تجريبية ==========
app.post( /api/v1/seed , async (req, res) => {
    try {
        // حذف البيانات الموجودة
        await User.deleteMany({});
        await Category.deleteMany({});
        await Product.deleteMany({});
        await Wallet.deleteMany({});
        
        // إنشاء الفئات
        const categories = await Category.insertMany([
            {
                name:  بطاقات ألعاب ,
                nameEn:  Game Cards ,
                icon:  🎮 ,
                image:  https://cdn-icons-png.flaticon.com/512/2491/2491061.png ,
                slug:  game-cards ,
                level: 0,
                order: 1,
                metaTitle:  بطاقات ألعاب - ريم ستوري ,
                metaDescription:  أقوى بطاقات شحن الألعاب بأسعار مميزة 
            },
            {
                name:  رصيد جوال ,
                nameEn:  Mobile Balance ,
                icon:  📱 ,
                image:  https://cdn-icons-png.flaticon.com/512/724/724664.png ,
                slug:  mobile-balance ,
                level: 0,
                order: 2
            },
            {
                name:  بطاقات هدايا ,
                nameEn:  Gift Cards ,
                icon:  🎁 ,
                image:  https://cdn-icons-png.flaticon.com/512/3039/3039406.png ,
                slug:  gift-cards ,
                level: 0,
                order: 3
            },
            {
                name:  برامج وتطبيقات ,
                nameEn:  Software ,
                icon:  💻 ,
                image:  https://cdn-icons-png.flaticon.com/512/2991/2991107.png ,
                slug:  software ,
                level: 0,
                order: 4
            }
        ]);
        
        // إنشاء منتجات تجريبية مع أكواد
        const products = [];
        const gameCodes = [];
        for (let i = 0; i < 100; i++) {
            gameCodes.push({
                code: `PUBG-${i+1}-${crypto.randomBytes(4).toString( hex ).toUpperCase()}`,
                isUsed: false
            });
        }
        
        products.push({
            name:  شحن PUBG موبايل - 600 UC ,
            nameEn:  PUBG Mobile - 600 UC ,
            description:  شحن فوري لـ PUBG موبايل 600 UC بأسعار مميزة ,
            type:  GAME_CARD ,
            category: categories[0]._id,
            price: 120,
            comparePrice: 150,
            cost: 100,
            stockType:  DIGITAL ,
            stockQuantity: 100,
            digitalCodes: gameCodes,
            deliveryType:  AUTO ,
            thumbnail:  https://cdn-icons-png.flaticon.com/512/2491/2491061.png ,
            images: [ https://cdn-icons-png.flaticon.com/512/2491/2491061.png ],
            specifications: {
                platform: [ iOS ,  Android ],
                region: [ Global ,  Korea ,  Vietnam ]
            },
            features: [ شحن فوري ,  أسعار مميزة ,  دعم 24/7 ],
            seo: {
                title:  شحن PUBG موبايل 600 UC ,
                slug:  pubg-mobile-600-uc 
            },
            featured: true,
            bestSeller: true,
            status:  ACTIVE ,
            minQuantity: 1,
            maxQuantity: 5,
            tags: [ pubg ,  pubg mobile ,  uc ,  شحن ]
        });
        
        const freeFireCodes = [];
        for (let i = 0; i < 200; i++) {
            freeFireCodes.push({
                code: `FF-${i+1}-${crypto.randomBytes(4).toString( hex ).toUpperCase()}`,
                isUsed: false
            });
        }
        
        products.push({
            name:  شحن فري فاير - 1000 دايموند ,
            nameEn:  Free Fire - 1000 Diamonds ,
            description:  شحن فوري لفري فاير 1000 دايموند بأقل الأسعار ,
            type:  GAME_CARD ,
            category: categories[0]._id,
            price: 80,
            comparePrice: 100,
            cost: 65,
            stockType:  DIGITAL ,
            stockQuantity: 200,
            digitalCodes: freeFireCodes,
            deliveryType:  AUTO ,
            thumbnail:  https://cdn-icons-png.flaticon.com/512/2491/2491061.png ,
            featured: true,
            bestSeller: true,
            sales: 150,
            seo: { slug:  free-fire-1000-diamonds  }
        });
        
        const stcCodes = [];
        for (let i = 0; i < 500; i++) {
            stcCodes.push({
                code: `STC-${i+1}-${crypto.randomBytes(4).toString( hex ).toUpperCase()}`,
                isUsed: false
            });
        }
        
        products.push({
            name:  رصيد STC - 100 ريال ,
            description:  شحن رصيد STC فوري بقيمة 100 ريال ,
            type:  MOBILE_BALANCE ,
            category: categories[1]._id,
            price: 100,
            stockType:  DIGITAL ,
            stockQuantity: 500,
            digitalCodes: stcCodes,
            thumbnail:  https://cdn-icons-png.flaticon.com/512/724/724664.png ,
            sales: 450,
            seo: { slug:  stc-balance-100  }
        });
        
        await Product.insertMany(products);
        
        // إنشاء مستخدم أدمن
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash( admin123 , salt);
        
        const admin = await User.create({
            name:  مدير الموقع ,
            email:  admin@remstore.com ,
            password: hashedPassword,
            phone:  0500000000 ,
            role:  admin ,
            isVerified: true
        });
        
        // إنشاء محفظة للأدمن
        await Wallet.create({
            user: admin._id,
            balance: 10000,
            currency:  SAR 
        });
        
        // إنشاء مستخدم عادي
        const userPassword = await bcrypt.hash( user123 , salt);
        const normalUser = await User.create({
            name:  مستخدم تجريبي ,
            email:  user@remstore.com ,
            password: userPassword,
            phone:  0512345678 ,
            role:  user ,
            isVerified: true
        });
        
        await Wallet.create({
            user: normalUser._id,
            balance: 500,
            currency:  SAR 
        });
        
        res.json({
            success: true,
            message:  ✅ تم إنشاء البيانات التجريبية بنجاح ,
            data: {
                categories: categories.length,
                products: products.length,
                users: 2,
                codes: {
                    gameCodes: gameCodes.length,
                    freeFireCodes: freeFireCodes.length,
                    stcCodes: stcCodes.length
                }
            }
        });
        
    } catch (error) {
        console.error( خطأ في إنشاء البيانات: , error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// ========== صفحة الترحيب ==========
app.get( / , (req, res) => {
    res.json({
        name:  🌸 ريم ستوري - المتجر الرقمي المتكامل ,
        version:  2.0.0 ,
        status:  running ,
        endpoints: {
            auth:  /api/v1/auth ,
            products:  /api/v1/products ,
            orders:  /api/v1/orders ,
            wallet:  /api/v1/wallet ,
            admin:  /api/v1/admin 
        },
        docs:  https://rem-store.com/docs ,
        support:  support@remstore.com 
    });
});

// ========== معالجة الأخطاء ==========
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message:  المسار غير موجود  
    });
});

app.use((err, req, res, next) => {
    console.error( خطأ عام: , err);
    res.status(500).json({ 
        success: false, 
        message:  حدث خطأ في الخادم  
    });
});

// ========== تشغيل الخادم ==========
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log( \n );
    console.log( =  .repeat(50));
    console.log( 🌸 ريم ستوري - المتجر الرقمي المتكامل v2.0 );
    console.log( =  .repeat(50));
    console.log(`📡 السيرفر يعمل على: http://localhost:${PORT}`);
    console.log(`📚 API متاح على: http://localhost:${PORT}/api/v1`);
    console.log( =  .repeat(50));
    console.log( 📝 حسابات تجريبية: );
    console.log(    أدمن: admin@remstore.com / admin123 );
    console.log(    مستخدم: user@remstore.com / user123 );
    console.log( =  .repeat(50));
    console.log( 🚀 لإنشاء بيانات تجريبية: POST /api/v1/seed );
    console.log( =  .repeat(50) +  \n );
});

// معالجة إيقاف التشغيل
process.on( SIGTERM , () => {
    console.log( 📥 جاري إيقاف الخادم... );
    server.close(() => {
        mongoose.connection.close();
        console.log( ✅ تم إيقاف الخادم بنجاح );
    });
});

module.exports = app;
