# Cıvıl

Türkçe anlatımlı, oyunlaştırılmış İngilizce öğrenme uygulaması. macOS masaüstü
uygulaması olarak çalışır, internet bağlantısı gerektirmez.

40 ünite · 160 ders · 720 kelime · 4160 cümle · A1 → B1

## Kurulum

Uygulama `Cıvıl.app` olarak derlenir:

```sh
npm install
npm run tauri build
```

Sonuç: `src-tauri/target/release/bundle/macos/Cıvıl.app`

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
    store.ts       can / XP / seri / elmas / aralıklı tekrar
    generate.ts    ders verisinden alıştırma üretimi
    audio.ts       Web Audio ses efektleri + telaffuz
  components/
    Exercises.tsx  8 alıştırma tipi ve puanlama
    Mascot.tsx     Pako (animasyonlu SVG)
    Icons.tsx      düz SVG ikon seti
  screens/         harita, ders, sonuç
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

Yazarak çeviride kelime düzeyinde tek sapmaya izin veriliyor — Tatoeba'da her
cümlenin tek bir referans çevirisi olduğu için katı eşleşme haksız olurdu.

## Tasarım

Duolingo'nun görsel dili hedeflendi: doygun yeşil paleti, 3B basma butonlar,
yuvarlak ağır tipografi (Nunito), zigzag ders patikası, can/seri/XP döngüsü.
Marka varlıkları taklit edilmedi — logo ve maskot (Pako) bu proje için çizildi.
