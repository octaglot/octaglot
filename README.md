# Octaglot

Türkçe anlatımlı, oyunlaştırılmış İngilizce öğrenme uygulaması. macOS masaüstü
uygulaması olarak çalışır, internet bağlantısı gerektirmez.

40 ünite · 160 ders · 720 kelime · 4160 cümle · A1 → B1

## Kurulum

Uygulama `Octaglot.app` olarak derlenir:

```sh
npm install
npm run tauri build
```

Sonuç: `src-tauri/target/release/bundle/macos/Octaglot.app`

Geliştirirken:

```sh
npm run tauri dev
```

## İçerik nasıl üretiliyor

Ders içeriği elle yazılmadı; açık kaynaklardan derlendi.

| Kaynak | Ne alınıyor | Lisans |
| --- | --- | --- |
| [Tatoeba](https://tatoeba.org) | 660 bin Türkçe–İngilizce cümle çifti | CC-BY 2.0 FR |
| [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) | İngilizce kelime sıklık listesi | CC-BY-SA 4.0 |
| [Wiktionary](https://kaikki.org) | Kelimelerin Türkçe karşılıkları | CC-BY-SA 3.0 |
| [FreeDict](https://freedict.org) | Yedek sözlük | GPL |

Müfredat `scripts/curriculum.mjs` içinde tanımlı: 40 tematik ünite, her birinin
çekirdek kelime listesi var. Derleyici bu listeyi sıklık sırasına göre
tamamlıyor, sonra her ders için **yalnızca o ana kadar öğretilmiş kelimelerden
oluşan** Tatoeba cümlelerini seçiyor. Zorluk böylece kendiliğinden ve doğru
sırayla artıyor.

İçeriği yeniden üretmek (ham veri `data/raw/` altına iner, ~180 MB):

```sh
npm run content:candidates   # aday kelime listesini çıkarır
npm run content:glosses      # Wiktionary'den Türkçe karşılıkları çeker
npm run content:build        # src-tauri/resources/content.db üretir
```

`content:glosses` indirdiklerini `data/kaikki-raw.json` içinde önbelleğe alır.
Karşılık seçme mantığını değiştirdiğinde yeniden indirmen gerekmez:

```sh
npm run content:derive
```

### Kalite notları

Sözlükte anlam seçimi Wiktionary'nin **sayfa sırasına** göre yapılıyor. Denenen
alternatifler daha kötüydü: "en çok çevirisi olan anlam" kuralı `water → sulamak`,
`run → koşu`, `because → öyle işte` veriyordu; "önce isim" kuralı ise
`go → go` (Go oyunu) veriyordu.

Sıklık listesi altyazı korpusundan türediği için küfür içeriyor; `BLOCKLIST` ile
eleniyor. `went → go` gibi çekimli biçimler `INFLECTED` ile ders kelimesi
olmaktan çıkarılıyor. Kalan tekil hatalar `OVERRIDES` ile elle düzeltiliyor
(`glass → bardak`, `plane → uçak` gibi).

## Mimari

```
src/
  lib/
    db.ts          içerik ve kullanıcı veritabanı erişimi
    store.ts       can / XP / seri / elmas / aralıklı tekrar / görev / efsane
    generate.ts    ders verisinden alıştırma üretimi
    storm.ts       fırtına havuzu, kart çekme, puan (saf)
    quests.ts      tohumlu günlük görev üretimi (saf)
    rand.ts        shuffle / pick / tohumlu üreteç
    audio.ts       Web Audio ses efektleri + telaffuz
  components/
    Exercises.tsx  8 alıştırma tipi ve puanlama
    QuestCard.tsx  günlük görev kartı
    Mascot.tsx     Okta (animasyonlu SVG ahtapot)
    Icons.tsx      düz SVG ikon seti
  screens/         harita, ders, fırtına, sonuç
src-tauri/
  src/lib.rs       içerik veritabanını yazılabilir dizine kopyalar
  resources/       content.db (uygulamayla paketlenir)
```

**İki veritabanı var.** `content.db` uygulamayla paketlenir ve salt-okunurdur;
Rust tarafı ilk açılışta onu yazılabilir dizine kopyalar. `user.db` ilerlemeyi
tutar. Ayrı olmalarının sebebi: içerik güncellendiğinde ilerleme silinmesin.

**Ses dosyası yok.** Efektler Web Audio API ile anlık üretiliyor, telaffuz
`speechSynthesis` ile yapılıyor. Böylece paket küçük kalıyor ve telifli ses
kullanılmıyor.

## Alıştırma tipleri

Kelime kartı · Çoktan seçmeli · Eşleştirme · Boşluk doldurma · Kelime bankasıyla
çeviri · Dinle-yaz · Cümle sıralama · Yazarak çeviri

Ders dışında üç mod var, aşağıda anlatılıyor.

Yazarak çeviride kelime düzeyinde tek sapmaya izin veriliyor — Tatoeba'da her
cümlenin tek bir referans çevirisi olduğu için katı eşleşme haksız olurdu.

## Ders dışı modlar

Uygulama çevrimdışı ve tek kullanıcılı; Duolingo'nun lig/arkadaş yarışı buraya
taşınamıyor. Sahte rakip uydurmak yerine kişi kendi geçmişiyle ve günlük
görevlerle yarışıyor.

**Eşleştirme Fırtınası.** 60 saniyede kelime çifti eşleştirme. Can harcamaz,
yanlış cevap süreden 2 saniye götürür, kombo beşte doyar. Havuz bitmiş
derslerin kelimelerinden kurulur; vadesi gelmiş tekrar kelimeleri öne alınır ve
verilen her cevap aralıklı tekrara yazılır — mod tekrarın kopyası değil,
hızlandırıcısı. 20 kelime öğrenilmeden kilitli durur, çünkü küçük havuzda aynı
çift üst üste gelir. Günde ilk 3 tur XP verir (puanın 25'te biri, en çok 40):
sınırsız XP veren 60 saniyelik bir mod 50 XP'lik günlük hedefi anlamsızlaştırır.

**Günlük görevler.** Günde üç görev, günün tarihinden türeyen tohumla seçilir —
uygulama gün içinde kapanıp açılınca aynı üçlü çıkar. Görev başına 10 elmas,
üçü birden bitince 15 bonus; ödül elle alınır. Ölçülen şeyler mevcut olaylardan
geliyor: XP, biten ders, bir derste en uzun doğru serisi, fırtına puanı, tekrar
edilen kelime.

**Efsane seviye.** Bitmiş bir derse tıklayınca çıkan seçenek. 30 elmasla
girilir, can harcamaz; yerine üç hata hakkı vardır ve dolunca elmas geri
gelmez. Sorular tek dersten değil ünitenin tamamından gelir ve yalnızca üretim
gerektiren tipler kullanılır (yazarak çeviri, dinle-yaz, boşluk doldurma, cümle
sıralama) — kelime bankası ve çoktan seçmeli tanımayla çözülebildiği için
dışarıda. Geçilen ders haritada taç ve altın halkayla durur, ödülü 60 XP.

## Test

```sh
npm test
```

Vitest, yalnız saf modülleri kapsıyor (`storm.ts`, `quests.ts`,
`legendaryKinds.ts`). Ekranlar ve store test edilmiyor: `db.ts` Tauri
eklentisini çekiyor, Node ortamında yüklenmiyor. Oyun mantığı bu yüzden
veritabanına ve React'e dokunmayan modüllere ayrıldı.

## Tasarım

Duolingo'dan yalnızca **mekanik** alındı: 3B basma butonlar, yuvarlak ağır
tipografi (Nunito), zigzag ders patikası, can/seri/XP döngüsü. **Palet
bilinçli olarak alınmadı** — Duolingo asit yeşili (#58cc02) ve saf gri nötrler
üzerine kuruludur; Octaglot mor (#8a63d2, GitHub Desktop moru) üzerine kurulu
ve nötrleri de mora çalar.

Bütün renkler `src/design/tokens.css` içinde **rol adlarıyla** durur
(`--brand`, `--success`, `--danger`…), bileşenlerde hex yazılmaz. Üstünde beyaz
metin duran geniş yüzeylerde `--brand` değil `--brand-strong` / `--deep-*`
tonları kullanılır: `--brand` beyazla 4.38:1 verip WCAG AA eşiğinin altında
kalıyor.

### Marka

**İşaret** kenetlenmiş iki halkadır — iki dil birbirine kilitli. Dış yarıçap 60,
iç yarıçap 30, iki merkez 60 birim arayla; her halkanın diğerine denk gelen
çeyreği boş bırakıldığı için üst üste binmeden kenetlenirler. Kalınlık her yerde
eşit olduğundan 16 piksele indiğinde de dolmuyor. Kaynak dosyalar
`public/brand/` altında.

**Uygulama ikonu** Apple'ın macOS ızgarasına uyar: 1024'lük tuvalde çizim
824×824'lük alana oturur, kalan kenar boşluğu saydamdır — Dock'ta komşularıyla
aynı optik boyutu ancak böyle tutturur. Köşeler yuvarlatılmış kare değil,
süperelips (squircle) ile çizilir.

**Maskot** Okta, mor bir ahtapot; sekiz kolu sekiz alıştırma tipine denk gelir.
Çizim [Twemoji](https://github.com/jdecked/twemoji)'nin ahtapot emojisinden
(U+1F419) uyarlandı, **CC-BY 4.0** ile lisanslı. Atıf uygulamanın profil
ekranında görünür. Yapılan değişiklikler: arka ve orta kollar tek yoldan
ayrılıp bağımsız canlandırıldı, ruh haline göre göz ve ağız eklendi.
