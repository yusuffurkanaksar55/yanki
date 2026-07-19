export const tr = {
  app: {
    name: "Anonim Değerlendirme Platformu",
    kicker: "İç değerlendirme sistemi"
  },
  navigation: {
    primaryAriaLabel: "Ana gezinme",
    dashboard: "Kontrol paneli",
    cycles: "Süreçler",
    projects: "Projeler",
    reports: "Raporlar"
  },
  dashboard: {
    eyebrow: "Hazırlık görünümü",
    title: "Değerlendirme kontrol paneli",
    summary:
      "Organizasyon, proje ve anonim değerlendirme süreçleri için güvenli temel iskelet hazırlandı.",
    actions: {
      newCycle: "Yeni süreç",
      manageTemplates: "Şablonları yönet"
    },
    metricsSectionLabel: "Durum özetleri",
    metrics: {
      activeCycles: {
        label: "Açık süreç",
        detail: "Henüz üretim değerlendirme süreci oluşturulmadı."
      },
      pendingAssignments: {
        label: "Bekleyen atama",
        detail: "Atama akışı sonraki fazda kurulacak."
      },
      threshold: {
        label: "Anonimlik eşiği",
        detail: "Varsayılan güvenlik alt sınırı."
      },
      secureStorage: {
        label: "Şifreli saklama",
        value: "Planlandı",
        detail: "Uygulama zamanı backend sınırında uygulanacak."
      }
    },
    workflow: {
      title: "Kurulum sırası",
      description:
        "Hassas değerlendirme akışları başlamadan önce temel güvenlik parçaları tamamlanacak.",
      badge: "İskelet fazı",
      steps: [
        "Kimlik doğrulama ve davetli kayıt altyapısı",
        "Rol ve kapsam tabanlı yetkilendirme",
        "Supabase RLS politikaları",
        "Anonim credential ve şifreli gönderim akışı"
      ]
    },
    privacy: {
      title: "Gizlilik durumu",
      threshold:
        "Yeterli sayıda anonim değerlendirme bulunmadığı sürece sonuçlar gösterilmeyecek."
    },
    readiness: {
      identitySeparation: "Kimlik ve içerik ayrımı",
      encryptionBoundary: "Server-side şifreleme sınırı",
      runtimeAuth: "Çalışan yetkilendirme kontrolleri",
      databasePolicies: "Veritabanı RLS politikaları"
    },
    status: {
      documented: "Belgelendi",
      notStarted: "Başlamadı"
    },
    session: {
      signedInAs: "Oturum",
      signOut: "Çıkış yap",
      signingOut: "Çıkış yapılıyor"
    }
  },
  auth: {
    loading: "Oturum durumu kontrol ediliyor.",
    pageTitle: "Güvenli giriş",
    pageSummary:
      "Şirket hesabınla giriş yaparak yalnızca sana atanmış değerlendirme işlemlerine erişebilirsin.",
    securityHighlights: [
      {
        title: "Yetkili erişim",
        description:
          "Hassas işlemler yalnızca doğrulanmış oturumla başlatılacak."
      },
      {
        title: "Gizlilik sınırı",
        description:
          "Değerlendirme içerikleri frontend tarafında saklanmayacak."
      }
    ],
    configuration: {
      title: "Bağlantı ayarları eksik"
    },
    signIn: {
      title: "Oturum aç",
      description:
        "Supabase Auth e-posta ve şifre girişinin ilk temel akışı."
    },
    form: {
      emailLabel: "E-posta adresi",
      passwordLabel: "Şifre",
      signInButton: "Giriş yap",
      submitting: "İşleniyor"
    },
    passwordReset: {
      title: "Şifremi unuttum",
      emailLabel: "Şifre sıfırlama e-postası",
      submitButton: "Sıfırlama bağlantısı gönder"
    },
    validation: {
      emailRequired: "E-posta adresi zorunludur.",
      emailInvalid: "Geçerli bir e-posta adresi gir.",
      passwordRequired: "Şifre zorunludur.",
      passwordTooShort: "Şifre en az 6 karakter olmalıdır."
    },
    feedback: {
      passwordResetRequested:
        "Şifre sıfırlama bağlantısı e-posta adresine gönderildiyse kısa süre içinde ulaşacaktır.",
      configurationError:
        "Supabase bağlantı ayarları eksik veya hatalı. .env.local dosyasını kontrol et.",
      AUTH_SESSION_READ_FAILED:
        "Oturum bilgisi okunurken bir hata oluştu.",
      AUTH_SIGN_IN_FAILED:
        "E-posta veya şifre bilgileri doğrulanamadı.",
      AUTH_PASSWORD_RESET_FAILED:
        "Şifre sıfırlama bağlantısı gönderilemedi.",
      AUTH_SIGN_OUT_FAILED:
        "Çıkış yapılırken bir hata oluştu.",
      genericError: "Beklenmeyen bir hata oluştu."
    }
  }
} as const;
