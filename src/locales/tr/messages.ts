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
    }
  }
} as const;
