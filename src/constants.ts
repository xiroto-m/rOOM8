/**
 * rOOM8 Event Configuration
 * 更新はこのファイルを書き換えるだけでサイトに反映されます。
 */

export const EVENT_INFO = {
  nextDate: "2026.05.15 (金)",
  nextTime: "19:30 〜",
  locationName: "代々木台マンション 4階8号室",
  address: "東京都渋谷区代々木 4-28-8 代々木台マンション 408",
  access: "京王新線 初台駅 徒歩7分 / 小田急 参宮橋駅 徒歩10分",
  fee: "1,000円 (19歳以下・お子様無料)",
  googleMapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.1347648356193!2d139.6914561!3d35.6737525!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188cb7e4e16d41%3A0x67db233eaca5144b!2z5Luj44CF5pyo5Y-w44Oe44Oz44K344On44Oz!5e0!3m2!1sja!2sjp!4v1714900000000!5m2!1sja!2sjp",
  instagram: "https://www.instagram.com/tackyosya955/",
  youtube: "https://youtube.com/@tackyosya955?si=eZRhJn1KSxNry-o3",
  contactEmail: "taku448@gmail.com",
  apps: [
    {
      name: "TapTack - Buy & Sell",
      url: "https://apps.apple.com/jp/app/taptack-buy-sell/id6444877818",
      icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/1f/14/c1/1f14c1ad-d6ab-a061-8ea1-30399ee10142/AppIcon-1x_U007emarketing-0-11-0-85-220-0.png/400x400ia-75.webp",
      screenshots: [
        "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/c0/f8/7e/c0f87ecd-f54d-c245-6bb6-661e6b15f526/123458.jpg/460x998bb.webp",
        "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/33/47/dd/3347dd38-0774-1b83-eb36-54af9cf63e77/123459.jpg/460x998bb.webp",
        "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/b2/f7/7b/b2f77b1f-c971-ca1a-49e6-22fa4a76b334/123460.jpg/460x998bb.webp",
        "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/c6/0a/ee/c60aee20-3ca6-aede-b688-a211ae07816d/123463.jpg/460x998bb.webp",
        "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/02/b8/39/02b839c3-d97a-889e-2e37-025fd9ccedac/123461.jpg/460x998bb.webp",
        "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/22/cc/75/22cc7577-7075-ba2b-13c1-be3644cc9f7b/123462.jpg/460x998bb.webp"
      ],
      description: "rOOM8のコミュニティから生まれた、モノの売り買いをより自由に、より楽しくするアプリです。"
    }
  ]
};

export const FALLBACK_EVENTS = [
  {
    id: 'e1',
    title: "あの高島くん厳選！ボードゲームをギャラリーで遊び尽くす 🔥",
    date: "2026.05.15 (金)",
    time: "19:30〜",
    locationName: "代々木台マンション 4階8号室",
    address: "東京都渋谷区代々木 4-28-8 代々木台マンション 408",
    access: "京王新線 初台駅 徒歩7分 / 小田急 参宮橋駅 徒歩10分",
    fee: "1,000円 (19歳以下・お子様無料)",
    googleMapEmbedUrl: EVENT_INFO.googleMapEmbedUrl,
    order: 1,
    likesCount: 1
  },
  {
    id: 'e2',
    title: "晴れろ！！☀️ ルーフトップでスカイバー 🏔 持ち寄りギャラリー rOOM8",
    date: "2026.05.31 (日)",
    time: "13:00〜",
    locationName: "代々木台マンション 屋上",
    address: "東京都渋谷区代々木 4-28-8 代々木台マンション 屋上",
    access: "京王新線 初台駅 徒歩7分 / 小田急 参宮橋駅 徒歩10分",
    fee: "1,000円 (19歳以下・お子様無料)",
    googleMapEmbedUrl: EVENT_INFO.googleMapEmbedUrl,
    order: 2,
    likesCount: 1
  }
];

export const SECTIONS = {
  hero: {
    catchCopy: "みんなの『好き』を持ち寄って 飾る！語る！繋がる！",
    title: "あの高島くん厳選！ボードゲームをギャラリーで遊び尽くす 🔥",
  },
  about: {
    description: "「発信する側」と「受け取る側」といった既存の枠組みから抜け出し、クリエイターもファンも対等な50:50の関係で交流できるコミュニティです。美味しい食べ物や渾身の作品、あなたのスキルや知識など、それぞれの「ポートフォリオ」を持ち寄って一緒にワイワイ楽しみましょう。",
    points: [
      "事前連絡なし・飛び入り参加・知り合いの同伴OK！",
      "初めての人でも安心して楽しめるアットホームな雰囲気",
    ]
  },
  potluck: {
    food: "「美味しいもアート！」自分の分量を持ってきて完食・完飲を目指しましょう。",
    works: "テクノロジー、エッセイ、歌、なんでも。ジャンルは完全不問です。"
  },
  facilities: [
    { title: "作品販売", desc: "ギャラリー取り分は0円！作者の次の制作を全力で応援します。" },
    { title: "楽器・音楽", desc: "楽器の持ち込み歓迎！電子ピアノもあります（※家主は弾けませんが笑）。" },
    { title: "本の持ち寄り", desc: "好きなページを開いて、その魅力を語り合いましょう。" },
    { title: "デジタル展示", desc: "Mac mini ＋ 55インチ大画面モニター完備。デジタル作品もOK。" }
  ]
};
