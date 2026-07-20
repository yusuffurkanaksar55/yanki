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
    reports: "Raporlar",
    administration: "Yönetim"
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
      profile: "Profil",
      signedInAs: "Oturum",
      signOut: "Çıkış yap",
      signingOut: "Çıkış yapılıyor"
    },
    workspace: {
      sectionLabel: "Çalışma bağlamı",
      title: "Çalışma bağlamı",
      description:
        "Bu oturum için tanımlı rol, organizasyon ve yönetici bilgileri.",
      labels: {
        roles: "Roller",
        memberships: "Birimler",
        managers: "Yöneticiler"
      },
      empty: {
        roles: "Rol ataması yok.",
        memberships: "Birim üyeliği yok.",
        managers: "Yönetici ataması yok.",
        managerName: "Tanımlı yönetici"
      },
      roleLabels: {
        SYSTEM_ADMIN: "Sistem yöneticisi",
        EMPLOYEE: "Çalışan",
        TEAM_LEADER: "Takım lideri",
        PROJECT_MANAGER: "Proje müdürü",
        C_LEVEL_REVIEWER: "C-Level gözlemci",
        BOARD_REVIEWER: "Yönetim kurulu gözlemcisi"
      },
      scopeLabels: {
        PLATFORM: "Platform",
        ORGANIZATION: "Organizasyon",
        DEPARTMENT: "Departman",
        UNIT: "Birim",
        TEAM: "Takım",
        PROJECT: "Proje",
        EVALUATION_CYCLE: "Değerlendirme süreci"
      },
      unitTypeLabels: {
        DEPARTMENT: "Departman",
        UNIT: "Birim",
        TEAM: "Takım",
        CUSTOM: "Özel yapı"
      }
    },
    administration: {
      title: "Yönetim görünümü",
      description:
        "Bu hesapta yönetim rolü var. Organizasyon, davet, proje ve değerlendirme süresi ayarları ayrı yönetim akışında ilerleyecek."
    }
  },
  administration: {
    eyebrow: "Korumalı yönetim",
    title: "Yönetim alanı",
    summary:
      "Davet, rol, organizasyon, proje ve değerlendirme süresi ayarları için ayrı yönetim görünümü.",
    roles: {
      sectionLabel: "Yönetim rolleri",
      title: "Etkin yönetim kapsamı",
      description: "Bu oturumda yönetim görünümünü açan rol ve kapsamlar."
    },
    workflowsSectionLabel: "Yönetim iş akışları",
    workflows: [
      {
        status: "Canlı temel",
        title: "Kullanıcı ve davetler",
        description:
          "Davet oluşturma ve profil aktivasyonu güvenilir backend üzerinden ilerler.",
        items: [
          "Davet oluşturma",
          "Davet iptali",
          "Profil aktivasyonu"
        ]
      },
      {
        status: "Yetkilendirme bekliyor",
        title: "Rol ve hiyerarşi",
        description:
          "Birden fazla admin, CEO, proje müdürü ve takım lideri kapsamlı rol atamalarıyla yönetilecek.",
        items: [
          "Birim yönetimi",
          "Rol kapsamı",
          "Yönetici ilişkisi"
        ]
      },
      {
        status: "Model temeli",
        title: "Projeler",
        description:
          "Proje adı, proje müdürü, proje üyeleri ve proje bitiş tarihi yönetim akışına hazırlanıyor.",
        items: [
          "Proje kaydı",
          "Proje üyeleri",
          "Proje bitiş tarihi"
        ]
      },
      {
        status: "Tarih bazlı",
        title: "Değerlendirme süreleri",
        description:
          "Değerlendirmeler sabit kişi sayısına bağlı olmadan açılabilecek ve kapanış tarihiyle sınırlandırılacak.",
        items: [
          "Açılış zamanı",
          "Kapanış tarihi",
          "Anonimlik eşiği"
        ]
      }
    ],
    datePolicy: {
      title: "Proje ve değerlendirme tarihleri",
      description:
        "Proje tamamlanma tarihi ve son değerlendirme tarihi yönetim akışının temel tarih alanlarıdır.",
      projectCompletionLabel: "Proje bitiş tarihi",
      evaluationCloseLabel: "Değerlendirme kapanış tarihi",
      configuredBy: "Admin veya yetkilendirilmiş proje müdürü"
    },
    safeguards: {
      title: "Güvenlik sınırı",
      items: [
        "Yönetim görünümü değerlendirme içeriği okumaz.",
        "Hassas işlemler frontend rol kontrolüne bırakılmaz.",
        "Edge Function ve RLS kontrolleri eklenmeden üretim işlemi açılmaz."
      ]
    },
    users: {
      sectionLabel: "Kullanıcı ve davet yönetimi",
      eyebrow: "Kimlik yönetimi",
      title: "Kullanıcı davetleri",
      loading: "Davet seçenekleri yükleniyor.",
      form: {
        displayName: "Ad soyad",
        email: "E-posta adresi",
        organization: "Organizasyon",
        unit: "Birim",
        role: "Rol",
        manager: "Yönetici",
        noManager: "Yönetici atanmayacak",
        expiresInDays: "Geçerlilik süresi (gün)",
        submit: "Davet gönder",
        submitting: "Gönderiliyor"
      },
      list: {
        sectionLabel: "Davet kayıtları",
        title: "Son davetler",
        empty: "Henüz davet oluşturulmadı.",
        revoke: "Daveti iptal et",
        revoking: "İptal ediliyor"
      },
      statusLabels: {
        PENDING: "Bekliyor",
        ACCEPTED: "Kabul edildi",
        REVOKED: "İptal edildi",
        EXPIRED: "Süresi doldu"
      },
      feedback: {
        created: "Davet e-postası gönderildi.",
        revoked: "Davet iptal edildi.",
        USER_ADMINISTRATION_SESSION_REQUIRED:
          "Oturum doğrulanamadı. Lütfen tekrar giriş yap.",
        USER_ADMINISTRATION_LIST_FAILED:
          "Kullanıcı ve davet bilgileri okunamadı.",
        USER_INVITATION_CREATE_FAILED: "Davet oluşturulamadı.",
        USER_INVITATION_REVOKE_FAILED: "Davet iptal edilemedi.",
        genericError: "Beklenmeyen bir kullanıcı yönetimi hatası oluştu."
      }
    },
    projects: {
      sectionLabel: "Proje ve değerlendirme süreci yönetimi",
      form: {
        title: "Yeni proje süreci",
        organizationId: "Organizasyon ID",
        projectName: "Proje adı",
        projectCode: "Proje kodu",
        projectCompletedOn: "Proje bitiş tarihi",
        evaluationName: "Değerlendirme adı",
        projectManagerUserId: "Proje müdürü kullanıcı ID",
        opensAt: "Açılış zamanı",
        closesAt: "Kapanış zamanı",
        submit: "Proje süreci oluştur",
        submitting: "Kaydediliyor"
      },
      list: {
        title: "Projeler",
        loading: "Projeler yükleniyor.",
        empty: "Henüz görüntülenebilir proje yok.",
        projectCompletedOn: "Proje bitişi",
        evaluationClose: "Değerlendirme kapanışı",
        noDate: "Tarih yok"
      },
      members: {
        sectionLabel: "proje üyeleri",
        title: "Proje üyeleri",
        empty: "Bu projeye henüz üye eklenmemiş.",
        user: "Proje üyesi",
        userPlaceholder: "Üye seç",
        projectManagerPlaceholder: "Proje müdürü seç",
        noOrganizationMembers: "Organizasyon üyesi bulunamadı",
        kind: "Üyelik türü",
        add: "Üye ekle",
        adding: "Ekleniyor",
        kindLabels: {
          MEMBER: "Üye",
          PROJECT_MANAGER: "Proje müdürü",
          SPONSOR: "Sponsor",
          OBSERVER: "Gözlemci"
        }
      },
      assignments: {
        title: "Değerlendirme atamaları",
        noCycle: "Bu proje için değerlendirme süreci bulunamadı.",
        total: "Toplam",
        pending: "Bekleyen",
        completed: "Tamamlanan",
        cancelled: "İptal",
        generate: "Atamaları oluştur",
        generating: "Oluşturuluyor"
      },
      feedback: {
        created: "Proje ve değerlendirme süreci oluşturuldu.",
        memberAdded: "Proje üyesi eklendi.",
        assignmentsGenerated: "Değerlendirme atamaları oluşturuldu.",
        PROJECT_CYCLE_SESSION_REQUIRED:
          "Oturum doğrulanamadı. Lütfen tekrar giriş yap.",
        PROJECT_CYCLE_LIST_FAILED: "Projeler okunamadı.",
        PROJECT_CYCLE_CREATE_FAILED:
          "Proje ve değerlendirme süreci oluşturulamadı.",
        PROJECT_MEMBER_LIST_FAILED: "Organizasyon üyeleri okunamadı.",
        PROJECT_MEMBER_ADD_FAILED: "Proje üyesi eklenemedi.",
        PROJECT_ASSIGNMENT_GENERATE_FAILED:
          "Değerlendirme atamaları oluşturulamadı.",
        genericError: "Beklenmeyen bir proje yönetimi hatası oluştu."
      }
    },
    blocked: {
      title: "Yönetim yetkisi yok",
      description:
        "Bu görünüm için yönetim rolü gerekir. Nihai izinler yine trusted backend ve RLS tarafından doğrulanacaktır.",
      backLink: "Kontrol paneline dön"
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
  },
  profile: {
    loading: {
      title: "Profil kontrol ediliyor",
      description: "Davet ve kullanıcı profil bilgilerin güvenli şekilde okunuyor."
    },
    missing: {
      title: "Davet kaydı bekleniyor",
      description:
        "Oturum açıldı, ancak bu hesap için kullanıcı profili henüz oluşturulmamış. Davet bağlantını kontrol et veya sistem yöneticisinden yeni davet iste."
    },
    inactive: {
      title: "Profil aktif değil",
      description:
        "Bu hesap için davetli katılım süreci henüz tamamlanmamış veya erişim geçici olarak durdurulmuş.",
      acceptInvitation: "Daveti tamamla",
      accepting: "Davet tamamlanıyor"
    },
    blocked: {
      title: "Profil bilgisi okunamadı"
    },
    session: {
      signedInAs: "Oturum",
      signOut: "Çıkış yap",
      signingOut: "Çıkış yapılıyor"
    },
    feedback: {
      PROFILE_READ_FAILED:
        "Profil bilgisi okunurken bir hata oluştu. Lütfen daha sonra tekrar dene.",
      PROFILE_INVITATION_ACCEPT_FAILED:
        "Davet tamamlanamadı. Davet bağlantısının geçerli olduğundan emin ol.",
      genericError: "Beklenmeyen bir profil hatası oluştu."
    }
  },
  workspace: {
    loading: "Çalışma bağlamı kontrol ediliyor.",
    blocked: {
      title: "Çalışma bağlamı okunamadı"
    },
    feedback: {
      WORKSPACE_CONTEXT_READ_FAILED:
        "Rol ve organizasyon bilgileri okunurken bir hata oluştu.",
      genericError: "Beklenmeyen bir çalışma bağlamı hatası oluştu."
    }
  }
} as const;
