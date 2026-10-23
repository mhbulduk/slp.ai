/**
 * Uluslararası Fonetik Alfabe (IPA) Türkçe Sesli Harfler ve Fonetik Kurallar Standardı
 * 
 * Standart Sesli (Ünlü) Eşleşmeleri:
 * /a/ -> ʌ (Açık-orta arka düz ünlü)
 * /e/ -> ɛ (Açık-orta ön düz ünlü)
 * /i/ -> ɪ (Kapalıya yakın ön düz ünlü)
 * /ı/ -> ɯ (Kapalı arka düz ünlü)
 * /u/ -> u (Kapalı arka yuvarlak ünlü)
 * /ü/ -> y (Kapalı ön yuvarlak ünlü)
 * /o/ -> o (Yarı kapalı arka yuvarlak ünlü)
 * /ö/ -> œ (Açık-orta ön yuvarlak ünlü)
 */

export interface TurkishIpaVowel {
  letter: string;
  ipa: string;
  name: string;
  description: string;
  exampleWord: string;
  exampleIpa: string;
}

export const TURKISH_IPA_VOWELS: TurkishIpaVowel[] = [
  {
    letter: "a",
    ipa: "ʌ",
    name: "Açık-orta arka düz ünlü",
    description: "Dil arkada ve çene açık konumda üretilir. Standart klinik Türkçe transkripsiyonunda 'ʌ' ile sembolize edilir.",
    exampleWord: "araba",
    exampleIpa: "/ʌɾʌbʌ/"
  },
  {
    letter: "e",
    ipa: "ɛ",
    name: "Açık-orta ön düz ünlü",
    description: "Dil ön bölgede, dudaklar düz ve ağız yarı açıktır. Standart IPA sembolü 'ɛ' (epsilon) karakteridir.",
    exampleWord: "kedi",
    exampleIpa: "/kɛdɪ/"
  },
  {
    letter: "i",
    ipa: "ɪ",
    name: "Kapalıya yakın ön düz ünlü",
    description: "Dil önde ve damağa yakındır, dudaklar gevşek düzdür. Standart IPA sembolü 'ɪ' karakteridir.",
    exampleWord: "kitap",
    exampleIpa: "/kɪtʌp/"
  },
  {
    letter: "ı",
    ipa: "ɯ",
    name: "Kapalı arka düz ünlü",
    description: "Dil arkada damağa yakın, dudaklar yuvarlatılmamış düzdür. Standart IPA sembolü 'ɯ' karakteridir.",
    exampleWord: "ışık",
    exampleIpa: "/ɯʃɯk/"
  },
  {
    letter: "u",
    ipa: "u",
    name: "Kapalı arka yuvarlak ünlü",
    description: "Dil arkada, dudaklar öne doğru yuvarlaktır. Standart IPA sembolü 'u' karakteridir.",
    exampleWord: "uçak",
    exampleIpa: "/utʃʌk/"
  },
  {
    letter: "ü",
    ipa: "y",
    name: "Kapalı ön yuvarlak ünlü",
    description: "Dil önde, dudaklar yuvarlaktır. Standart Uluslararası Fonetik Alfabe'de 'y' harfiyle temsil edilir.",
    exampleWord: "köprü",
    exampleIpa: "/kœpɾy/"
  },
  {
    letter: "o",
    ipa: "o",
    name: "Yarı kapalı arka yuvarlak ünlü",
    description: "Dil arka-orta düzeyde, dudaklar belirgin yuvarlaktır. Standart IPA sembolü 'o' karakteridir.",
    exampleWord: "yol",
    exampleIpa: "/jol/"
  },
  {
    letter: "ö",
    ipa: "œ",
    name: "Açık-orta ön yuvarlak ünlü",
    description: "Dil ön-orta bölgede, dudaklar yuvarlaktır. Standart IPA sembolü 'œ' karakteridir.",
    exampleWord: "ördek",
    exampleIpa: "/œɾdɛk/"
  }
];

/**
 * IPA transkripsiyon metnindeki standart dışı Latin sesli harflerini
 * onaylanmış Türkçe IPA sesli harf normlarına dönüştürür.
 * 
 * /a/ -> ʌ
 * /e/ -> ɛ
 * /i/ -> ɪ
 * /ı/ -> ɯ
 * /ö/ -> œ
 * /ü/ -> y
 * (u ve o standart IPA sembolü olarak korunur)
 */
export function normalizeTurkishIpaVowels(ipaString: string): string {
  if (!ipaString) return "";
  
  return ipaString
    // a -> ʌ (büyük veya küçük a)
    .replace(/[aA]/g, "ʌ")
    // e -> ɛ (büyük veya küçük e)
    .replace(/[eE]/g, "ɛ")
    // i, İ -> ɪ (noktalı i sesleri)
    .replace(/[iİ]/g, "ɪ")
    // ı, I -> ɯ (noktasız ı sesleri)
    .replace(/[ıI]/g, "ɯ")
    // ö, Ö -> œ (ön yuvarlak açık-orta)
    .replace(/[öÖ]/g, "œ")
    // ü, Ü -> y (ön yuvarlak kapalı)
    .replace(/[üÜ]/g, "y");
}
