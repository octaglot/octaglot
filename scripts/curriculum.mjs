// The Octaglot curriculum - 40 units, A1 to B1.
// Each unit's `seeds` list holds its thematic core words; the builder tops them
// up to `targetWords` with further words in frequency order.

export const CEFR_BANDS = [
  { level: 'A1', units: [1, 12] },
  { level: 'A2', units: [13, 26] },
  { level: 'B1', units: [27, 40] },
];

export const UNITS = [
  {
    title: 'İlk Adımlar',
    subtitle: 'Selamlaşma ve tanışma',
    icon: 'hand',
    seeds: ['hello', 'hi', 'goodbye', 'yes', 'no', 'please', 'thanks', 'sorry', 'good', 'morning', 'night', 'welcome'],
  },
  {
    title: 'Ben ve Sen',
    subtitle: 'Zamirler ve "to be"',
    icon: 'person',
    seeds: ['i', 'you', 'he', 'she', 'we', 'they', 'it', 'am', 'is', 'are', 'my', 'your'],
  },
  {
    title: 'Aile',
    subtitle: 'Aile üyeleri',
    icon: 'family',
    seeds: ['mother', 'father', 'sister', 'brother', 'son', 'daughter', 'family', 'child', 'baby', 'wife', 'husband', 'parent'],
  },
  {
    title: 'Sayılar',
    subtitle: 'Sayma ve miktar',
    icon: 'number',
    seeds: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'many', 'few'],
  },
  {
    title: 'Yiyecek',
    subtitle: 'Temel yiyecekler',
    icon: 'food',
    seeds: ['bread', 'water', 'milk', 'egg', 'meat', 'fish', 'rice', 'apple', 'cheese', 'sugar', 'salt', 'eat'],
  },
  {
    title: 'İçecekler',
    subtitle: 'İçmek ve sipariş',
    icon: 'drink',
    seeds: ['tea', 'coffee', 'juice', 'drink', 'cold', 'hot', 'cup', 'glass', 'bottle', 'want', 'like', 'need'],
  },
  {
    title: 'Renkler',
    subtitle: 'Renkler ve tanımlama',
    icon: 'color',
    seeds: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'color', 'dark', 'light', 'bright', 'pink'],
  },
  {
    title: 'Ev',
    subtitle: 'Evdeki eşyalar',
    icon: 'home',
    seeds: ['house', 'home', 'room', 'door', 'window', 'table', 'chair', 'bed', 'kitchen', 'wall', 'floor', 'key'],
  },
  {
    title: 'Günlük Fiiller',
    subtitle: 'En sık kullanılan eylemler',
    icon: 'action',
    seeds: ['go', 'come', 'see', 'do', 'make', 'take', 'give', 'know', 'say', 'work', 'live', 'have'],
  },
  {
    title: 'Zaman',
    subtitle: 'Günler ve saatler',
    icon: 'clock',
    seeds: ['day', 'week', 'month', 'year', 'today', 'tomorrow', 'yesterday', 'time', 'hour', 'minute', 'now', 'late'],
  },
  {
    title: 'Okul',
    subtitle: 'Sınıf ve öğrenme',
    icon: 'school',
    seeds: ['school', 'teacher', 'student', 'book', 'pen', 'read', 'write', 'learn', 'study', 'question', 'answer', 'class'],
  },
  {
    title: 'Hayvanlar',
    subtitle: 'Evcil ve yabani hayvanlar',
    icon: 'animal',
    seeds: ['dog', 'cat', 'bird', 'horse', 'cow', 'animal', 'mouse', 'sheep', 'chicken', 'tail', 'wing', 'pet'],
  },
  {
    title: 'Vücut',
    subtitle: 'Vücut bölümleri',
    icon: 'body',
    seeds: ['head', 'hand', 'eye', 'ear', 'nose', 'mouth', 'foot', 'arm', 'leg', 'hair', 'face', 'finger'],
  },
  {
    title: 'Kıyafet',
    subtitle: 'Giyim ve beden',
    icon: 'clothes',
    seeds: ['shirt', 'dress', 'shoe', 'hat', 'coat', 'wear', 'size', 'pocket', 'skirt', 'sock', 'jacket', 'button'],
  },
  {
    title: 'Şehirde',
    subtitle: 'Yol tarifi ve yerler',
    icon: 'city',
    seeds: ['city', 'street', 'road', 'shop', 'park', 'left', 'right', 'near', 'far', 'corner', 'bridge', 'square'],
  },
  {
    title: 'Alışveriş',
    subtitle: 'Satın alma ve fiyat',
    icon: 'shop',
    seeds: ['buy', 'sell', 'price', 'money', 'cheap', 'expensive', 'pay', 'market', 'bag', 'cost', 'change', 'free'],
  },
  {
    title: 'Hava Durumu',
    subtitle: 'Mevsimler ve hava',
    icon: 'weather',
    seeds: ['rain', 'snow', 'sun', 'wind', 'cloud', 'warm', 'cool', 'weather', 'summer', 'winter', 'spring', 'storm'],
  },
  {
    title: 'Duygular',
    subtitle: 'Hisler ve ruh hali',
    icon: 'emotion',
    seeds: ['happy', 'sad', 'angry', 'afraid', 'tired', 'feel', 'love', 'hate', 'laugh', 'cry', 'smile', 'worry'],
  },
  {
    title: 'Sıfatlar',
    subtitle: 'Tanımlayıcı kelimeler',
    icon: 'adjective',
    seeds: ['big', 'small', 'long', 'short', 'new', 'old', 'young', 'strong', 'easy', 'hard', 'fast', 'slow'],
  },
  {
    title: 'Ulaşım',
    subtitle: 'Araçlar ve yolculuk',
    icon: 'transport',
    seeds: ['car', 'bus', 'train', 'plane', 'bike', 'drive', 'ride', 'ticket', 'station', 'stop', 'travel', 'wait'],
  },
  {
    title: 'Meslekler',
    subtitle: 'İşler ve görevler',
    icon: 'job',
    seeds: ['doctor', 'nurse', 'driver', 'cook', 'farmer', 'police', 'job', 'office', 'boss', 'worker', 'engineer', 'lawyer'],
  },
  {
    title: 'Geçmiş Zaman',
    subtitle: 'Olmuş olaylar',
    icon: 'past',
    seeds: ['was', 'were', 'went', 'saw', 'did', 'made', 'said', 'came', 'took', 'gave', 'found', 'thought'],
  },
  {
    title: 'Seyahat',
    subtitle: 'Tatil ve konaklama',
    icon: 'travel',
    seeds: ['hotel', 'room', 'trip', 'map', 'beach', 'mountain', 'passport', 'luggage', 'visit', 'tourist', 'guide', 'abroad'],
  },
  {
    title: 'Restoran',
    subtitle: 'Sipariş ve yemek',
    icon: 'restaurant',
    seeds: ['menu', 'order', 'waiter', 'plate', 'fork', 'knife', 'spoon', 'bill', 'taste', 'dinner', 'lunch', 'breakfast'],
  },
  {
    title: 'Sağlık',
    subtitle: 'Hastalık ve tedavi',
    icon: 'health',
    seeds: ['sick', 'pain', 'medicine', 'hospital', 'fever', 'healthy', 'rest', 'hurt', 'blood', 'heart', 'cure', 'patient'],
  },
  {
    title: 'Teknoloji',
    subtitle: 'Cihazlar ve internet',
    icon: 'tech',
    seeds: ['phone', 'computer', 'internet', 'screen', 'email', 'file', 'click', 'password', 'network', 'device', 'search', 'online'],
  },
  {
    title: 'Doğa',
    subtitle: 'Çevre ve manzara',
    icon: 'nature',
    seeds: ['tree', 'flower', 'river', 'sea', 'forest', 'stone', 'field', 'sky', 'earth', 'grass', 'island', 'valley'],
  },
  {
    title: 'Spor',
    subtitle: 'Oyunlar ve hareket',
    icon: 'sport',
    seeds: ['play', 'game', 'ball', 'team', 'win', 'lose', 'run', 'jump', 'swim', 'match', 'player', 'score'],
  },
  {
    title: 'Sanat',
    subtitle: 'Müzik ve kültür',
    icon: 'art',
    seeds: ['music', 'song', 'sing', 'dance', 'film', 'story', 'paint', 'stage', 'artist', 'sound', 'voice', 'theatre'],
  },
  {
    title: 'Gelecek',
    subtitle: 'Planlar ve niyetler',
    icon: 'future',
    seeds: ['will', 'plan', 'hope', 'future', 'soon', 'maybe', 'decide', 'promise', 'ready', 'begin', 'continue', 'finish'],
  },
  {
    title: 'Ev İşleri',
    subtitle: 'Günlük rutin',
    icon: 'chores',
    seeds: ['clean', 'wash', 'cook', 'sweep', 'repair', 'garden', 'iron', 'dirty', 'tidy', 'rubbish', 'shelf', 'towel'],
  },
  {
    title: 'Arkadaşlık',
    subtitle: 'İlişkiler ve sosyal hayat',
    icon: 'friends',
    seeds: ['friend', 'meet', 'invite', 'party', 'talk', 'together', 'share', 'help', 'trust', 'neighbour', 'guest', 'alone'],
  },
  {
    title: 'Para',
    subtitle: 'Bankacılık ve bütçe',
    icon: 'money',
    seeds: ['bank', 'account', 'save', 'spend', 'borrow', 'lend', 'debt', 'salary', 'card', 'cash', 'rich', 'poor'],
  },
  {
    title: 'Eğitim',
    subtitle: 'Üniversite ve sınavlar',
    icon: 'education',
    seeds: ['exam', 'degree', 'course', 'lesson', 'university', 'subject', 'homework', 'result', 'library', 'research', 'knowledge', 'skill'],
  },
  {
    title: 'Medya',
    subtitle: 'Haber ve iletişim',
    icon: 'media',
    seeds: ['news', 'report', 'article', 'channel', 'magazine', 'interview', 'announce', 'public', 'opinion', 'social', 'message', 'record'],
  },
  {
    title: 'Çevre',
    subtitle: 'İklim ve sürdürülebilirlik',
    icon: 'environment',
    seeds: ['climate', 'pollution', 'energy', 'waste', 'protect', 'nature', 'plastic', 'recycle', 'damage', 'clean', 'planet', 'future'],
  },
  {
    title: 'İş Hayatı',
    subtitle: 'Kariyer ve toplantılar',
    icon: 'business',
    seeds: ['meeting', 'company', 'client', 'project', 'deadline', 'contract', 'manage', 'employ', 'career', 'success', 'business', 'market'],
  },
  {
    title: 'Görüşler',
    subtitle: 'Fikir belirtme',
    icon: 'opinion',
    seeds: ['think', 'believe', 'agree', 'disagree', 'reason', 'because', 'however', 'although', 'perhaps', 'certain', 'doubt', 'suggest'],
  },
  {
    title: 'Koşullar',
    subtitle: 'Şart cümleleri',
    icon: 'condition',
    seeds: ['if', 'would', 'could', 'should', 'unless', 'might', 'wish', 'happen', 'result', 'cause', 'depend', 'choice'],
  },
  {
    title: 'Soyut Kavramlar',
    subtitle: 'İleri seviye ifadeler',
    icon: 'abstract',
    seeds: ['idea', 'truth', 'freedom', 'justice', 'power', 'change', 'society', 'culture', 'nature', 'value', 'purpose', 'meaning'],
  },
];

// The frequency list is derived from a subtitle corpus, so it contains
// profanity and conversational filler; none of that belongs in a lesson.
export const BLOCKLIST = new Set(`
sex shit fuck fucking fucked fuckin damn goddamn ass asshole bitch bastard crap
dick piss hell whore slut cunt
gonna wanna gotta lemme kinda sorta yep nope huh uh um em ya nah
mr mrs ms st dr etc vs
`.trim().split(/\s+/));

// Inflected forms are useless as flashcards ("went = go"). They are excluded
// from automatic filling; where they do appear in a unit's seeds (unit 22, past
// tense, for example) OVERRIDES supplies the correct gloss.
export const INFLECTED = new Set(`
got won seen heard knew told done met brought tried
men women children days times minutes needs looks
taking making doing going coming talking working trying telling living saying
gone wanted used said came
`.trim().split(/\s+/));

// Wiktionary's page order picks the right sense for most words but gets some
// wrong (glass->cam, plane->yüzey), and the FreeDict fallback is messy
// (ok->Oklahoma). Those are corrected by hand.
export const OVERRIDES = {
  // Core function words
  no: 'hayır', please: 'lütfen', yeah: 'evet', ok: 'tamam', okay: 'tamam',
  am: 'ben ...-im', is: 'o ...-dir', are: 'sen/siz ...-sin', be: 'olmak',
  do: 'yapmak', does: 'yapar', have: 'sahip olmak', has: 'sahip',
  will: 'gelecek zaman: -ecek', shall: '-ecek', would: '-ardı, -erdi',
  could: '-abilirdi', should: '-malı, -meli', might: '-abilir', can: '-abilmek',
  unless: '-medikçe', while: '-iken', since: '-den beri', although: '-e rağmen',
  however: 'ancak, fakat', though: '-e rağmen', whether: '-ip -mediği',
  hey: 'hey, baksana', oh: 'ah, ya', ah: 'ah', wow: 'vay be', bye: 'hoşça kal',
  mom: 'anne', dad: 'baba', sir: 'efendim', lady: 'hanımefendi',
  well: 'iyi, peki', right: 'doğru, sağ', out: 'dışarı', up: 'yukarı',
  down: 'aşağı', off: 'kapalı, uzak', then: 'sonra', so: 'bu yüzden, çok',
  much: 'çok', little: 'küçük, az', kind: 'tür, nazik', either: 'ya ... ya da',
  least: 'en az', able: 'yapabilen', if: 'eğer', cause: 'sebep olmak',
  depend: 'bağlı olmak', clear: 'net, açık', sort: 'tür, çeşit',

  // Past tense (unit 22)
  was: 'idi, -di', were: 'idiler, -diler', went: 'gitti', saw: 'gördü',
  did: 'yaptı', made: 'yaptı', said: 'söyledi', came: 'geldi', took: 'aldı',
  gave: 'verdi', found: 'buldu', thought: 'düşündü',

  // Words where the wrong sense was picked
  glass: 'bardak', chair: 'sandalye', room: 'oda', wall: 'duvar',
  plane: 'uçak', team: 'takım', sound: 'ses', fast: 'hızlı',
  engineer: 'mühendis', fork: 'çatal', bill: 'hesap, fatura',
  fine: 'iyi, güzel', subject: 'konu', shot: 'atış', pick: 'seçmek',
  watch: 'saat, izlemek', screen: 'ekran', park: 'park', phone: 'telefon',
  stage: 'sahne', channel: 'kanal', course: 'kurs, ders', country: 'ülke',
  feeling: 'his, duygu', crazy: 'deli', afraid: 'korkmuş',
  sorry: 'üzgünüm, pardon', welcome: 'hoş geldin', thanks: 'teşekkürler',
  film: 'film', farmer: 'çiftçi', driver: 'şoför', office: 'ofis',
  station: 'istasyon', shoe: 'ayakkabı', size: 'beden, boyut',
  dress: 'elbise', skirt: 'etek', sock: 'çorap', square: 'meydan, kare',
  free: 'ücretsiz, özgür', cost: 'maliyet, tutmak', market: 'market, pazar',
  order: 'sipariş, düzen', taste: 'tat, tatmak', rest: 'dinlenmek',
  hurt: 'acıtmak', cure: 'tedavi', patient: 'hasta', heart: 'kalp',
  score: 'skor, puan', paint: 'boyamak', voice: 'ses',
  promise: 'söz vermek', finish: 'bitirmek', tidy: 'derli toplu',
  rubbish: 'çöp', shelf: 'raf', iron: 'ütü, demir', party: 'parti',
  share: 'paylaşmak', trust: 'güvenmek', guest: 'misafir',
  close: 'kapatmak, yakın', set: 'kurmak', save: 'biriktirmek, kurtarmak',
  salary: 'maaş', rich: 'zengin', wish: 'dilemek', fight: 'kavga etmek',
  fire: 'ateş, yangın', exam: 'sınav', degree: 'derece, diploma',
  knowledge: 'bilgi', report: 'rapor', interview: 'röportaj, mülakat',
  announce: 'duyurmak', public: 'halk, kamu', record: 'kayıt',
  waste: 'israf, atık', recycle: 'geri dönüştürmek', damage: 'hasar',
  nature: 'doğa', break: 'kırmak', town: 'kasaba', meeting: 'toplantı',
  company: 'şirket', deadline: 'son tarih', manage: 'yönetmek',
  employ: 'işe almak', power: 'güç', agree: 'katılmak',
  disagree: 'katılmamak', doubt: 'şüphe', suggest: 'önermek',
  sick: 'hasta', master: 'usta, efendi', lie: 'yalan, uzanmak', sense: 'duyu, anlam', honey: 'tatlım, bal', front: 'ön', line: 'çizgi, sıra',
  freedom: 'özgürlük', purpose: 'amaç', alive: 'hayatta',
  guy: 'adam, herif', thing: 'şey', stuff: 'şey, eşya',
  mean: 'anlamına gelmek', get: 'almak, olmak', like: 'gibi, hoşlanmak',
  matter: 'önemli olmak, mesele', case: 'durum, olay', means: 'yol, araç',
  deal: 'anlaşma', check: 'kontrol etmek', point: 'nokta, puan',
  body: 'vücut', chance: 'şans, fırsat', word: 'kelime', number: 'sayı',
  account: 'hesap', card: 'kart', result: 'sonuç', side: 'yan, taraf',
  war: 'savaş', gun: 'silah', bit: 'parça, birazcık', whole: 'bütün',
  start: 'başlamak', use: 'kullanmak', guess: 'tahmin etmek',
  end: 'son, bitmek', begin: 'başlamak', miss: 'özlemek, kaçırmak',
  real: 'gerçek', already: 'zaten', without: '-siz, -sız',
  travel: 'seyahat etmek', abroad: 'yurt dışında', guide: 'rehber',
  trip: 'gezi', beach: 'plaj, kumsal', earth: 'dünya, toprak',
  grass: 'çimen', field: 'tarla, alan', stone: 'taş', river: 'nehir',
  best: 'en iyi', pretty: 'oldukça, güzel', such: 'böyle, öyle',
  once: 'bir kez', yet: 'henüz', ever: 'hiç, her zaman',
  name: 'isim', place: 'yer', life: 'hayat', people: 'insanlar',
  god: 'tanrı', dead: 'ölü', kill: 'öldürmek', die: 'ölmek',
};

export const CONFIG = {
  lessonsPerUnit: 4,
  targetWordsPerUnit: 18,
  minSentencesPerLesson: 14,
  maxSentencesPerLesson: 26,
  maxEnglishWords: 11,
  minEnglishWords: 2,
};
