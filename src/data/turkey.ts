/** Türkiye il / ilçe verisi (adres formları için) */

export const PROVINCES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir',
  'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli',
  'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay',
  'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis', 'Kırıkkale',
  'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde',
  'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop', 'Şırnak', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon',
  'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
] as const;

const DISTRICTS: Record<string, string[]> = {
  İstanbul: [
    'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz',
    'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa',
    'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer', 'Silivri', 'Sultanbeyli',
    'Sultangazi', 'Şile', 'Şişli', 'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu',
  ],
  Ankara: ['Altındağ', 'Çankaya', 'Etimesgut', 'Gölbaşı', 'Keçiören', 'Mamak', 'Pursaklar', 'Sincan', 'Yenimahalle', 'Polatlı', 'Beypazarı'],
  İzmir: ['Bayraklı', 'Bornova', 'Buca', 'Çiğli', 'Gaziemir', 'Karabağlar', 'Karşıyaka', 'Konak', 'Narlıdere', 'Balçova', 'Urla', 'Çeşme', 'Menemen', 'Torbalı'],
  Bursa: ['Nilüfer', 'Osmangazi', 'Yıldırım', 'Gemlik', 'İnegöl', 'Mudanya', 'Gürsu', 'Kestel'],
  Antalya: ['Muratpaşa', 'Konyaaltı', 'Kepez', 'Aksu', 'Döşemealtı', 'Alanya', 'Manavgat', 'Kemer', 'Kaş'],
  Adana: ['Seyhan', 'Çukurova', 'Yüreğir', 'Sarıçam', 'Ceyhan'],
  Konya: ['Selçuklu', 'Meram', 'Karatay', 'Ereğli', 'Akşehir'],
  Gaziantep: ['Şahinbey', 'Şehitkamil', 'Oğuzeli', 'Nizip'],
  Kocaeli: ['İzmit', 'Gebze', 'Darıca', 'Gölcük', 'Körfez', 'Başiskele', 'Kartepe'],
  Eskişehir: ['Odunpazarı', 'Tepebaşı'],
  Mersin: ['Akdeniz', 'Mezitli', 'Toroslar', 'Yenişehir', 'Tarsus', 'Erdemli'],
  Kayseri: ['Kocasinan', 'Melikgazi', 'Talas', 'Develi'],
  Trabzon: ['Ortahisar', 'Akçaabat', 'Yomra', 'Of', 'Araklı'],
  Samsun: ['Atakum', 'İlkadım', 'Canik', 'Tekkeköy', 'Bafra'],
  Erzurum: ['Yakutiye', 'Palandöken', 'Aziziye', 'Oltu'],
  Nevşehir: ['Merkez', 'Ürgüp', 'Avanos', 'Göreme', 'Gülşehir'],
  Muğla: ['Menteşe', 'Bodrum', 'Fethiye', 'Marmaris', 'Datça', 'Milas'],
  Tekirdağ: ['Süleymanpaşa', 'Çorlu', 'Çerkezköy', 'Kapaklı'],
  Sakarya: ['Adapazarı', 'Serdivan', 'Erenler', 'Hendek'],
  Denizli: ['Merkezefendi', 'Pamukkale', 'Çivril'],
};

export function districtsOf(province: string): string[] {
  return DISTRICTS[province] ?? ['Merkez'];
}

/** Örnek mahalle önerileri */
export const SAMPLE_NEIGHBORHOODS: Record<string, string[]> = {
  Kadıköy: ['Caferağa', 'Moda', 'Fenerbahçe', 'Göztepe', 'Koşuyolu', 'Acıbadem', 'Suadiye'],
  Beşiktaş: ['Sinanpaşa', 'Bebek', 'Levent', 'Ortaköy', 'Etiler', 'Arnavutköy'],
  Çankaya: ['Kızılay', 'Bahçelievler', 'Çukurambar', 'Ayrancı', 'Kavaklıdere', 'Ümitköy'],
  Karşıyaka: ['Bostanlı', 'Mavişehir', 'Alaybey', 'Bahariye'],
  Nilüfer: ['Görükle', 'Ataevler', 'Beşevler', 'Özlüce'],
  Muratpaşa: ['Lara', 'Fener', 'Şirinyalı', 'Kızılsaray'],
};

export function neighborhoodsOf(district: string): string[] {
  return SAMPLE_NEIGHBORHOODS[district] ?? ['Cumhuriyet', 'Atatürk', 'Yeni', 'Fatih', 'İstiklal', 'Merkez'];
}
