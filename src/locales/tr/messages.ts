export const tr = {
  app: {
    name: "Yankı",
    accountFallback: "Kullanıcı hesabı"
  },
  marketing: {
    navigation: {
      ariaLabel: "Tanıtım sitesi gezinmesi",
      mobileAriaLabel: "Mobil tanıtım sitesi gezinmesi",
      home: "Yankı ana sayfa",
      howItWorks: "Platform",
      privacy: "Veri güvenliği",
      deployment: "Kurulum seçenekleri",
      signIn: "Oturum aç",
      openMenu: "Menüyü aç",
      closeMenu: "Menüyü kapat"
    },
    hero: {
      title: "Kurumsal değerlendirme süreçlerini güvenle yönetin.",
      summary:
        "Çalışan, ekip, yönetici ve proje değerlendirmelerini tek çalışma alanında planlayın; yanıtları kimlikten ayrıştırılmış biçimde toplayın ve yetkili yöneticilere karar desteği sunun.",
      primaryAction: "Çalışma alanına gir",
      secondaryAction: "Platformu incele"
    },
    proof: {
      ariaLabel: "Yankı ürün ilkeleri",
      items: [
        {
          title: "Kimlikten ayrıştırılmış yanıtlar",
          description: "Değerlendirici kimliği, gönderilen değerlendirme içeriğiyle birlikte saklanmaz."
        },
        {
          title: "Sunucuda uygulanan yetki",
          description: "Rapor erişimi rol, organizasyon kapsamı ve yönetici ilişkilerine göre denetlenir."
        },
        {
          title: "SaaS veya şirket sunucusu",
          description: "Aynı ürün yönetilen hizmet olarak ya da kuruma özel altyapıda çalışabilir."
        }
      ]
    },
    workflow: {
      title: "Değerlendirme yaşam döngüsü tek çalışma alanında",
      summary:
        "Yankı, organizasyon kurgusundan raporlamaya kadar sürecin her aşamasını izlenebilir ve rol bazlı bir arayüzle yönetir.",
      steps: [
        {
          title: "Organizasyonu tanımlayın",
          description: "Şirketleri, birimleri, ekipleri ve doğrudan ya da fonksiyonel yönetici ilişkilerini gerçek yapınıza göre kurun."
        },
        {
          title: "Yetkileri kapsamlandırın",
          description: "Yönetim, proje ve raporlama rollerini organizasyon, ekip, proje veya değerlendirme süreci kapsamına atayın."
        },
        {
          title: "Şablonu yayınlayın",
          description: "Puan, seçim ve yorum sorularından oluşan sürümlü şablonları yayınlayın; geçmiş değerlendirmeleri değişikliklerden koruyun."
        },
        {
          title: "Süreci planlayın",
          description: "Değerlendirilecek kişileri, projeyi, başlangıç ve son tarihleri belirleyerek görevleri oluşturun."
        },
        {
          title: "Yanıtları toplayın",
          description: "Kullanıcılar yalnızca kendi açık görevlerini görür; değerlendirme içeriği şifrelenerek ve kimlikten ayrıştırılarak kaydedilir."
        },
        {
          title: "Sonuçları değerlendirin",
          description: "Yetkili üst roller, kendi kapsamlarındaki toplu skorları ve kimlikten ayrıştırılmış yorumları tek raporda inceler."
        }
      ]
    },
    governance: {
      title: "Her rol için açık sorumluluk ve kontrollü erişim",
      summary:
        "Arayüz, kullanıcının rolüne göre yalnızca ilgili iş akışlarını gösterir. Hassas erişim kararları sunucuda aynı kapsam kurallarıyla yeniden doğrulanır.",
      items: [
        {
          title: "Çalışan",
          description: "Kendisine atanmış değerlendirmeleri tamamlar; gönderilmiş içeriklere ve sonuçlara erişemez.",
          access: "Görev ve değerlendirme formu"
        },
        {
          title: "Takım ve üst yönetim",
          description: "Yalnızca tanımlı hiyerarşi ve organizasyon kapsamındaki kişilerin kimlikten ayrıştırılmış sonuçlarını inceler.",
          access: "Yetkili raporlar"
        },
        {
          title: "Proje müdürü",
          description: "Atandığı projelerin takvimini ve değerlendirme bitiş tarihlerini yönetir; rapor erişimi ayrıca yetkilendirilir.",
          access: "Proje operasyonları"
        },
        {
          title: "Sistem yöneticisi",
          description: "Kullanıcı, yapı, şablon ve süreç ayarlarını yönetir; değerlendirme içeriğini okuyamaz.",
          access: "Yapılandırma"
        }
      ]
    },
    security: {
      title: "Kurumsal veri sınırları ürünün merkezinde",
      summary:
        "Yankı; hassas içeriği tarayıcıdan, sistem yöneticilerinden ve yetkisiz organizasyon kapsamlarından ayıran katmanlı bir model kullanır.",
      items: [
        {
          title: "Şifreli değerlendirme içeriği",
          description: "Değerlendirme içeriği veritabanında düz metin olarak tutulmaz."
        },
        {
          title: "Kimlik ve içerik ayrımı",
          description: "Gönderim içeriği, değerlendiricinin kullanıcı kaydını taşımaz."
        },
        {
          title: "Sınırları sunucu uygular",
          description: "Kendi sonucuna erişim ve sistem yöneticisinin içerik okuması arayüzden bağımsız olarak engellenir."
        },
        {
          title: "Şeffaf gizlilik sınırı",
          description: "Az katılımlı gruplarda bağlamsal çıkarım riski vardır; şirket politikaları buna göre yapılandırılmalıdır."
        }
      ]
    },
    deployment: {
      title: "İşletim modelinize uygun kurulum",
      summary:
        "Tek ürün yaklaşımı iki dağıtım modelini de korur. Böylece küçük ekipler hızlı başlayabilir, özel altyapı isteyen kurumlar kontrolü kendi ortamında tutabilir.",
      saas: {
        title: "Yönetilen Yankı",
        description: "Kurulumla uğraşmadan şirket hesabınızı oluşturun; güncelleme, işletim ve yedekleme süreçlerini Yankı yönetsin.",
        features: ["Hızlı şirket kurulumu", "Merkezi güncelleme ve izleme", "Firma bazında mantıksal veri ayrımı"]
      },
      privateServer: {
        title: "Kuruma özel kurulum",
        description: "Uygulamayı, veritabanını ve güvenilir servisleri şirketin kendi sunucu veya özel bulut ortamında çalıştırın.",
        features: ["Kuruma ait altyapı ve anahtarlar", "Özel ağ ve güvenlik politikaları", "Aynı ürün ve veri modeli"]
      }
    },
    cta: {
      title: "Çalışma alanınız hazırsa, Yankı sizi bekliyor.",
      summary: "Size atanmış değerlendirmeleri tamamlayın veya yetkiniz kapsamındaki sonuçları inceleyin.",
      action: "Oturum aç"
    },
    footer: "Güvenli çalışan ve proje değerlendirme platformu"
  },
  navigation: {
    primaryAriaLabel: "Ana gezinme",
    dashboard: "Genel bakış",
    cycles: "Görevler",
    projects: "Projeler",
    reports: "Raporlar",
    administration: "Yönetim"
  },
  assignments: {
    sectionLabel: "Değerlendirme görevleri",
    title: "Değerlendirme görevlerim",
    description: "Size atanmış değerlendirmeler ve son teslim tarihleri.",
    loading: "Değerlendirme görevleri yükleniyor...",
    count: "{count} görev",
    filters: {
      label: "Görevleri filtrele",
      active: "Açık",
      completed: "Tamamlanan",
      all: "Tümü"
    },
    labels: {
      subject: "Değerlendirilecek kişi",
      project: "Proje",
      template: "Değerlendirme şablonu",
      opensAt: "Başlangıç",
      closesAt: "Son teslim"
    },
    status: {
      available: "Değerlendirmeye açık",
      upcoming: "Yakında açılacak",
      closed: "Süresi doldu",
      completed: "Tamamlandı"
    },
    values: {
      noProject: "Genel değerlendirme",
      unknownDate: "Tarih bilgisi yok"
    },
    empty: {
      title: "Atanmış değerlendirme bulunmuyor",
      description: "Yeni bir görev atandığında burada görüntülenecek."
    },
    filteredEmpty: {
      title: "Bu görünümde görev yok",
      description: "Diğer görevleri incelemek için üstteki filtrelerden birini seçin."
    },
    actions: {
      retry: "Yeniden dene",
      start: "Değerlendir",
      preparing: "Form hazırlanıyor...",
      showMore: "Daha fazla göster"
    },
    feedback: {
      readFailed: "Değerlendirme görevleri şu anda yüklenemedi."
    },
    submission: {
      subject: "Değerlendirilen kişi: {subject}",
      labels: {
        required: "Zorunlu",
        optional: "İsteğe bağlı",
        credentialExpiry: "Form geçerlilik süresi"
      },
      values: {
        yes: "Evet",
        no: "Hayır",
        select: "Bir seçenek belirleyin"
      },
      privacy: {
        title: "Anonim değerlendirme",
        description:
          "Yanıtlarınız kimliğinizle birlikte saklanmaz. Yorumlarınıza adınızı veya sizi doğrudan tanımlayabilecek ayrıntıları yazmayın."
      },
      actions: {
        close: "Formu kapat",
        cancel: "Vazgeç",
        submit: "Değerlendirmeyi gönder",
        submitting: "Şifrelenip gönderiliyor..."
      },
      feedback: {
        prepareFailed: "Değerlendirme formu hazırlanamadı. Görev hâlâ açıksa yeniden deneyin.",
        requiredAnswers: "Lütfen tüm zorunlu soruları yanıtlayın.",
        rateLimited: "Çok sayıda gönderim denemesi yapıldı. Lütfen kısa bir süre bekleyip yeniden deneyin.",
        tooLarge: "Yanıtların toplam boyutu gönderim sınırını aşıyor. Lütfen uzun metinleri kısaltıp yeniden deneyin.",
        submitFailed: "Değerlendirme gönderilemedi. Formun süresi dolmuş olabilir; formu kapatıp yeniden açın.",
        submitted: "Değerlendirmeniz şifrelenmiş olarak kaydedildi."
      }
    }
  },
  reports: {
    sectionLabel: "Anonim toplu değerlendirme raporları",
    eyebrow: "Yetkili sonuçlar",
    title: "Toplu değerlendirme raporları",
    description:
      "Yetki kapsamındaki aktif ve tamamlanmış süreçler, ilk değerlendirmeden itibaren toplu sonuç olarak güncellenir.",
    aggregateOnly: "Kimliksiz toplu sonuç",
    loadingTargets: "Erişilebilir raporlar yükleniyor...",
    subjectSearchLabel: "Kişi ara",
    subjectSearchPlaceholder: "Ad veya e-posta yazın",
    subjectSearchEmpty: "Aramanızla eşleşen kişi bulunamadı.",
    subjectLabel: "Değerlendirilen kişi",
    subjectPlaceholder: "Kişi seçin",
    cycleLabel: "Değerlendirme süreci",
    cyclePlaceholder: "Önce kişi, sonra süreç seçin",
    actions: {
      load: "Raporu görüntüle",
      loading: "Rapor hazırlanıyor...",
      retry: "Yeniden dene"
    },
    empty: {
      title: "Görüntülenebilir rapor yok",
      description:
        "Yetki kapsamınızda görüntüleyebileceğiniz bir rapor konusu bulunmuyor."
    },
    feedback: {
      targetsFailed: "Rapor listesi şu anda yüklenemedi.",
      reportFailed: "Rapor güvenli şekilde hazırlanamadı. Yetkinizi ve bağlantınızı kontrol edin."
    },
    noResponses: {
      title: "Henüz değerlendirme bulunmuyor",
      description:
        "Bu kişi için henüz değerlendirme gönderilmedi. Başka bir rapor konusu seçebilir veya ilk değerlendirmeyi bekleyebilirsiniz."
    },
    labels: {
      subject: "Değerlendirilen kişi",
      submissions: "Toplu yanıt",
      cycleEnd: "Süreç bitişi",
      answers: "yanıt",
      average: "Ortalama"
    },
    values: {
      yes: "Evet",
      no: "Hayır",
      organizationWide: "Organizasyon geneli"
    },
    textComments: {
      forSubjectTitle: "{subject} için yazılan yorumlar",
      description:
        "Yorumlar değerlendirici kimliği, gönderim zamanı ve diğer cevaplarla eşleştirme bilgisi olmadan gösterilir.",
      contextRisk:
        "Az katılımlı raporlarda ifade biçimi veya yorumdaki ayrıntılar kişiyi tahmin edilebilir kılabilir."
    }
  },
  dashboard: {
    eyebrow: "Çalışma alanı",
    title: "Değerlendirmelerine göz at",
    summary:
      "Bekleyen görevlerini tamamla ve yetkin dahilindeki toplu sonuçları incele.",
    metricsSectionLabel: "Durum özetleri",
    metrics: {
      loading: "Durum yükleniyor",
      activeCycles: {
        label: "Açık süreç"
      },
      pendingAssignments: {
        label: "Bekleyen görev"
      }
    },
    quickAccess: {
      sectionLabel: "Hızlı erişim bağlantıları",
      title: "Hızlı erişim"
    },
    session: {
      profile: "Profil",
      signedInAs: "Oturum",
      signOut: "Çıkış yap",
      signingOut: "Çıkış yapılıyor"
    },
    workspace: {
      sectionLabel: "Çalışma bağlamı",
      eyebrow: "Organizasyon",
      title: "Organizasyon bağlantın",
      description: "Organizasyon içindeki konumun, bağlı olduğun yöneticiler ve etkin yetki kapsamların.",
      hierarchyTitle: "Raporlama yolu",
      rolesTitle: "Görev ve yetki kapsamların",
      labels: {
        roles: "Roller",
        organization: "Organizasyon",
        memberships: "Birimler",
        managers: "Bağlı yönetici",
        you: "Sen"
      },
      empty: {
        roles: "Rol ataması yok.",
        memberships: "Birim üyeliği yok.",
        managers: "Yönetici ataması yok.",
        managerName: "Tanımlı yönetici"
      },
      values: {
        primaryMembership: "Ana birim",
        roleScope: "{scope} kapsamında",
        roleScopeCount: "{scope} kapsamında {count} atama"
      },
      relationshipLabels: {
        DIRECT: "Doğrudan yönetici",
        FUNCTIONAL: "Fonksiyonel yönetici"
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
      action: "Yönetimi aç"
    }
  },
  administration: {
    eyebrow: "Yankı yönetimi",
    title: "Yönetim alanı",
    summary:
      "Kullanıcıları, organizasyon yapısını ve değerlendirme süreçlerini tek yerden yönet.",
    moduleNavigationLabel: "Yönetim modülleri",
    modules: {
      projects: "Projeler",
      users: "Kullanıcılar",
      hierarchy: "Organizasyon",
      templates: "Şablonlar",
      security: "Güvenlik",
      retention: "Veri saklama"
    },
    roles: {
      sectionLabel: "Yönetim rolleri",
      title: "Etkin yönetim kapsamı",
      description: "Bu oturumda yönetim görünümünü açan rol ve kapsamlar."
    },
    securityOperations: {
      sectionLabel: "Şifreleme anahtarı sağlığı",
      eyebrow: "Güvenlik operasyonları",
      title: "Şifreleme anahtarı durumu",
      refresh: "Durumu yenile",
      refreshing: "Kontrol ediliyor",
      overall: "Genel durum",
      activeKey: "Etkin anahtar",
      historicalCoverage: "Geçmiş kayıt kapsamı",
      keyCounts: "Anahtar kapsamı",
      keyCountValue: "{configured} yapılandırılmış / {referenced} kullanımda",
      healthy: "Sağlıklı",
      unhealthy: "Müdahale gerekli",
      abuse: {
        title: "Anonim gönderim trafiği",
        invalidCredentials: "Geçersiz credential denemeleri / son 60 dakika",
        rateLimited: "Engellenen istekler / son 60 dakika",
        last24Hours: "Son 24 saat: {count}",
        retention: "Sayaç saklama süresi: {days} gün"
      },
      feedback: {
        SECURITY_OPERATIONS_SESSION_REQUIRED:
          "Oturum doğrulanamadı. Lütfen tekrar giriş yap.",
        ENCRYPTION_KEY_HEALTH_READ_FAILED:
          "Şifreleme anahtarı durumu okunamadı.",
        ABUSE_MONITORING_READ_FAILED:
          "Anonim gönderim güvenlik sayaçları okunamadı.",
        genericError: "Beklenmeyen bir güvenlik operasyonu hatası oluştu."
      }
    },
    retention: {
      sectionLabel: "Değerlendirme verisi saklama politikası",
      eyebrow: "Veri yaşam döngüsü",
      title: "Şifreli değerlendirme verisi saklama",
      description:
        "Her firma, şifreli değerlendirme içeriğinin canlı veritabanında ne kadar süre tutulacağını belirler. Yasal bekletme etkinse otomatik temizleme durur.",
      loading: "Saklama politikaları yükleniyor.",
      empty: "Yönetilebilecek aktif bir organizasyon bulunamadı.",
      form: {
        organization: "Organizasyon",
        retentionDays: "Saklama süresi (gün)",
        automaticPurge: "Otomatik temizlemeyi etkinleştir",
        automaticPurgeDescription:
          "Güvenilir operatör zamanlayıcısı, süresi dolan şifreli içeriği canlı veritabanından kaldırır.",
        legalHold: "Yasal bekletme uygula",
        legalHoldDescription:
          "Hukuki veya denetim gereksinimi boyunca bu organizasyon için temizleme yapılmaz.",
        save: "Politikayı kaydet",
        saving: "Kaydediliyor"
      },
      status: {
        title: "Uygulama durumu",
        policyVersion: "Politika sürümü",
        lastPurge: "Son tamamlanan temizleme",
        lastCutoff: "Son temizlenen tarih sınırı",
        never: "Henüz çalıştırılmadı"
      },
      backupNotice:
        "Canlı veritabanından kaldırılan içerik, mevcut şifreli yedeklerin saklama süresi dolana kadar yedeklerde bulunabilir. Yedek imha süresi altyapı politikasıyla ayrıca uygulanır.",
      validation: {
        retentionDays: "Saklama süresi 30 ile 3650 gün arasında olmalıdır."
      },
      feedback: {
        saved: "Değerlendirme verisi saklama politikası güncellendi.",
        EVALUATION_RETENTION_SESSION_REQUIRED:
          "Oturum doğrulanamadı. Lütfen tekrar giriş yap.",
        EVALUATION_RETENTION_LIST_FAILED:
          "Saklama politikaları okunamadı.",
        EVALUATION_RETENTION_UPDATE_FAILED:
          "Saklama politikası güncellenemedi.",
        genericError: "Beklenmeyen bir veri yaşam döngüsü hatası oluştu."
      }
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
    hierarchy: {
      sectionLabel: "Rol ve organizasyon hiyerarşisi yönetimi",
      eyebrow: "Organizasyon yapısı",
      title: "Rol ve hiyerarşi",
      loading: "Organizasyon yapısı yükleniyor.",
      empty: "Yönetilebilecek aktif bir organizasyon bulunamadı.",
      organization: "Organizasyon",
      units: {
        title: "Birimler",
        selectedUnit: "Düzenlenecek birim",
        newUnit: "Yeni birim",
        name: "Birim adı",
        slug: "Birim kodu",
        type: "Birim türü",
        parent: "Üst birim",
        noParent: "Üst birim yok",
        status: "Durum",
        active: "Aktif",
        archived: "Arşivlenmiş",
        submitCreate: "Birim oluştur",
        submitUpdate: "Birimi güncelle",
        submitting: "Kaydediliyor"
      },
      people: {
        title: "Üyelik ve yönetici",
        user: "Çalışan",
        primaryUnit: "Ana birim",
        membershipKind: "Üyelik türü",
        member: "Üye",
        leader: "Lider",
        manager: "Doğrudan yönetici",
        noManager: "Doğrudan yönetici yok",
        submit: "Hiyerarşiyi güncelle",
        submitting: "Güncelleniyor"
      },
      roles: {
        title: "Rol atamaları",
        user: "Çalışan",
        role: "Rol",
        unit: "Rol birimi",
        submit: "Rol ata",
        submitting: "Atanıyor",
        activeTitle: "Etkin roller",
        empty: "Bu çalışan için yönetilebilir etkin rol yok.",
        end: "Rolü sonlandır",
        ending: "Sonlandırılıyor"
      },
      feedback: {
        unitSaved: "Birim kaydedildi.",
        contextSaved: "Üyelik ve yönetici bilgisi güncellendi.",
        roleAssigned: "Rol atandı.",
        roleEnded: "Rol sonlandırıldı.",
        HIERARCHY_ADMINISTRATION_SESSION_REQUIRED:
          "Oturum doğrulanamadı. Lütfen tekrar giriş yap.",
        HIERARCHY_ADMINISTRATION_LIST_FAILED:
          "Rol ve hiyerarşi bilgileri okunamadı.",
        HIERARCHY_UNIT_SAVE_FAILED: "Birim kaydedilemedi.",
        HIERARCHY_CONTEXT_SAVE_FAILED:
          "Üyelik ve yönetici bilgisi güncellenemedi.",
        HIERARCHY_ROLE_ASSIGN_FAILED: "Rol atanamadı.",
        HIERARCHY_ROLE_END_FAILED: "Rol sonlandırılamadı.",
        genericError: "Beklenmeyen bir rol ve hiyerarşi hatası oluştu."
      }
    },
    templates: {
      sectionLabel: "Değerlendirme şablonu yönetimi",
      eyebrow: "Sürüm kontrollü yapı",
      title: "Değerlendirme şablonları",
      description:
        "Soruları taslakta düzenleyin. Yayınlanan sürüm değiştirilemez ve değerlendirme dönemine olduğu haliyle bağlanır.",
      loading: "Şablonlar yükleniyor.",
      empty: "Henüz değerlendirme şablonu oluşturulmadı.",
      form: {
        newTitle: "Yeni şablon",
        editTitle: "Taslak sürümü düzenle",
        organizationId: "Organizasyon",
        name: "Şablon adı",
        description: "Açıklama",
        questionsTitle: "Sorular",
        addQuestion: "Soru ekle",
        removeQuestion: "Soruyu kaldır",
        prompt: "Soru metni",
        questionType: "Soru türü",
        required: "Yanıt zorunlu",
        options: "Seçenekler",
        optionsHint: "Her satıra bir seçenek yazın.",
        save: "Taslağı kaydet",
        saving: "Kaydediliyor",
        cancel: "Yeni şablona dön"
      },
      list: {
        title: "Şablon sürümleri",
        version: "Sürüm {version}",
        questionCount: "{count} soru",
        published: "Yayınlandı",
        draft: "Taslak",
        editDraft: "Taslağı düzenle",
        publish: "Sürümü yayınla",
        publishing: "Yayınlanıyor",
        createVersion: "Yeni sürüm oluştur",
        cloning: "Oluşturuluyor",
        immutable: "Yayınlanan içerik değiştirilemez.",
        noDescription: "Açıklama yok"
      },
      questionTypes: {
        RATING_1_TO_5: "1-5 puan",
        RATING_1_TO_10: "1-10 puan",
        YES_NO: "Evet / Hayır",
        SINGLE_SELECT: "Tek seçim",
        MULTI_SELECT: "Çoklu seçim",
        SHORT_TEXT: "Kısa metin",
        LONG_TEXT: "Uzun metin",
        TAG_SELECTION: "Etiket seçimi"
      },
      feedback: {
        saved: "Şablon taslağı kaydedildi.",
        published: "Şablon sürümü yayınlandı ve artık değiştirilemez.",
        cloned: "Yeni düzenlenebilir sürüm oluşturuldu.",
        EVALUATION_TEMPLATE_SESSION_REQUIRED:
          "Oturum doğrulanamadı. Lütfen tekrar giriş yap.",
        EVALUATION_TEMPLATE_LIST_FAILED: "Şablonlar okunamadı.",
        EVALUATION_TEMPLATE_SAVE_FAILED: "Şablon taslağı kaydedilemedi.",
        EVALUATION_TEMPLATE_PUBLISH_FAILED: "Şablon sürümü yayınlanamadı.",
        EVALUATION_TEMPLATE_CLONE_FAILED: "Yeni şablon sürümü oluşturulamadı.",
        genericError: "Beklenmeyen bir şablon yönetimi hatası oluştu."
      }
    },
    projects: {
      sectionLabel: "Proje ve değerlendirme süreci yönetimi",
      statusLabels: {
        ACTIVE: "Aktif",
        ARCHIVED: "Arşivlendi",
        COMPLETED: "Tamamlandı"
      },
      form: {
        title: "Yeni proje süreci",
        organizationId: "Organizasyon",
        projectName: "Proje adı",
        projectCode: "Proje kodu",
        projectCompletedOn: "Proje bitiş tarihi",
        evaluationName: "Değerlendirme adı",
        templateVersion: "Yayınlanmış şablon sürümü",
        templateVersionPlaceholder: "Şablon sürümü seç",
        noPublishedTemplate: "Bu organizasyon için yayınlanmış şablon yok",
        projectManagerUserId: "Proje müdürü",
        opensAt: "Açılış zamanı",
        closesAt: "Kapanış zamanı",
        submit: "Proje süreci oluştur",
        submitting: "Kaydediliyor"
      },
      list: {
        title: "Projeler",
        loading: "Projeler yükleniyor.",
        empty: "Henüz görüntülenebilir proje yok.",
        showDetails: "Ayrıntıları göster",
        hideDetails: "Ayrıntıları gizle",
        projectCompletedOn: "Proje bitişi",
        evaluationClose: "Değerlendirme kapanışı",
        templateVersion: "Şablon sürümü",
        noTemplateVersion: "Şablon bilgisi yok",
        noDate: "Tarih yok"
      },
      dates: {
        sectionLabel: "proje tarihleri",
        title: "Proje tarihlerini yönet",
        projectCompletedOn: "Proje bitiş tarihi",
        closesAt: "Değerlendirme kapanış zamanı",
        save: "Tarihleri kaydet",
        saving: "Kaydediliyor",
        noCycle: "Düzenlenebilir değerlendirme süreci bulunamadı."
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
        datesUpdated: "Proje ve değerlendirme tarihleri güncellendi.",
        PROJECT_CYCLE_SESSION_REQUIRED:
          "Oturum doğrulanamadı. Lütfen tekrar giriş yap.",
        PROJECT_CYCLE_LIST_FAILED: "Projeler okunamadı.",
        PROJECT_CYCLE_CREATE_FAILED:
          "Proje ve değerlendirme süreci oluşturulamadı.",
        PROJECT_MEMBER_LIST_FAILED: "Organizasyon üyeleri okunamadı.",
        PROJECT_MEMBER_ADD_FAILED: "Proje üyesi eklenemedi.",
        PROJECT_ASSIGNMENT_GENERATE_FAILED:
          "Değerlendirme atamaları oluşturulamadı.",
        PROJECT_DATE_UPDATE_FAILED:
          "Proje ve değerlendirme tarihleri güncellenemedi.",
        genericError: "Beklenmeyen bir proje yönetimi hatası oluştu."
      }
    },
    blocked: {
      title: "Yönetim yetkisi yok",
      description: "Bu alanı görüntülemek için yönetim yetkisi gerekir.",
      backLink: "Kontrol paneline dön"
    }
  },
  auth: {
    loading: "Oturum durumu kontrol ediliyor.",
    backToSite: "Tanıtım sitesine dön",
    eyebrow: "Dürüst geri bildirim",
    pageTitle: "Her ses duyulsun, kimse işaret edilmesin.",
    pageSummary:
      "Sana atanan değerlendirmeleri tamamla, ekibinin gelişimine güvenle katkı sağla.",
    configuration: {
      title: "Bağlantı ayarları eksik"
    },
    signIn: {
      eyebrow: "Hesabın",
      title: "Oturum aç",
      description: "Şirket hesabınla Yankı çalışma alanına devam et."
    },
    form: {
      emailLabel: "E-posta adresi",
      passwordLabel: "Şifre",
      signInButton: "Giriş yap",
      submitting: "Giriş yapılıyor",
      showPassword: "Şifreyi göster",
      hidePassword: "Şifreyi gizle"
    },
    passwordReset: {
      title: "Şifremi unuttum",
      emailLabel: "Şifre sıfırlama e-postası",
      submitButton: "Sıfırlama bağlantısı gönder"
    },
    passwordSetup: {
      title: "Yeni şifreni belirle",
      passwordLabel: "Yeni şifre",
      confirmationLabel: "Yeni şifre tekrar",
      submitButton: "Şifreyi kaydet",
      submitting: "Şifre kaydediliyor",
      validation: {
        required: "Yeni şifre zorunludur.",
        minimumLength: "Yeni şifre en az 12 karakter olmalıdır.",
        complexity:
          "Yeni şifre büyük harf, küçük harf, rakam ve özel karakter içermelidir.",
        mismatch: "Şifreler eşleşmiyor."
      }
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
        "Bağlantı kurulamadı. Lütfen sistem yöneticinle iletişime geç.",
      AUTH_SESSION_READ_FAILED:
        "Oturum bilgisi okunurken bir hata oluştu.",
      AUTH_SIGN_IN_FAILED:
        "E-posta veya şifre bilgileri doğrulanamadı.",
      AUTH_PASSWORD_RESET_FAILED:
        "Şifre sıfırlama bağlantısı gönderilemedi.",
      AUTH_PASSWORD_UPDATE_FAILED:
        "Yeni şifre kaydedilemedi. Bağlantıyı yenileyip tekrar dene.",
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
