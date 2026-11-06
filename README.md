# Kontr: Qumtepa

Brauzerda ishlaydigan 3D taktik shooter (Counter-Strike uslubida). O‘rnatish shart emas — havolani oching va o‘ynang.

**O‘ynash:** https://zafarabdumalikov7777-netizen.github.io/kontr-qumtepa/

Mahalliy ishga tushirish: `index.html` faylini Chrome yoki Edge’da oching (internet kerak — Three.js va shriftlar CDN’dan yuklanadi).

## Rejimlar

- **Raqobat (C4 bomba):** T jamoa bombani A yoki B nuqtasiga qo‘yadi, KT zararsizlantiradi. 8 g‘alabagacha, iqtisod va xarid menyusi bilan.
- **Deathmatch:** 6 daqiqa, o‘lsangiz 2,5 soniyada qayta tug‘ilasiz, qurollar bepul.
- **Gun Game:** har 2 qotillikda keyingi qurol (Glock → USP → Deagle → MP5 → M4 → AK → AWP → pichoq), pichoq bilan o‘ldirgan g‘olib. O‘zining 3 ta xaritasi: Hovli, Sport zali, Qor labirinti.
- **Modli jang:** «Sirli orol» xaritasi, har 45 soniyada tasodifiy modlar: wallhack, Oy gravitatsiyasi, katta kallalar, odamlar robot/zombi/skelet/kosmonavt va boshqalarga aylanadi.
- **Mashq:** botlarsiz, cheksiz o‘q, devordagi oq nishon taxtasiga spray qilib tepkini nazorat qilishni o‘rganasiz.

## Imkoniyatlar

- 7 xarita: Qumtepa, Eskishahar, Ombor, Qorliq, Registon, Voha, Tungi bozor
- Ittifoqchi va raqib botlar soni (har jamoada 10 tagacha), 3 xil qiyinlik; botlar bomba qo‘yadi va zararsizlantiradi
- Granatalar: HE, flesh (ko‘r qiladi), tutun (ko‘rinishni to‘sadi); defuse kit
- Qurol olish/almashtirish (E), tashlash (G), qurolni ko‘zdan kechirish (F)
- CS2’dagi haqiqiy tepki: AK-47 va M4 uchun CS’ning har bir o‘qdagi siljish jadvali, ko‘rinish sapchishi, qurolning prujinali tepkisi; «Pritsel tepkiga ergashsin» sozlamasi
- CS2 uslubidagi spray naqshlari, bunnyhop va air strafe, km/soat va FPS ko‘rsatkichlari
- Seriya bannerlari (IKKITA!, UCHTA!, ACE!), hisob jadvalida BOSH% va ADR
- Sozlanadigan pritsel (rang, uzunlik, qalinlik, oraliq, kontur, nuqta, T-shakl, ulashish kodi)
- Sozlamalar: grafika sifati, FOV, ovoz, qurolni chap qo‘lda ushlash

## Keyslar, skinlar va agentlar

Bosh menyuda **KEYSLAR VA INVENTAR**. Har bir o‘yin oxirida hisobingizga pul tushadi (g‘alaba, qotillik, yutilgan raundlar uchun), boshlanishiga $1000 sovg‘a.

- **5 ta keys:** Qumtepa, Registon, Ipak yo‘li, Qish va Agentlar keysi. CS’dagidek ruletka va noyoblik darajalari: Harbiy, Cheklangan, Maxfiy, Yashirin, ★ Nodir pichoq.
- **6 xil pichoq** (Karambit, Kapalak, Nayza, Bowie, Chust pichog‘i va oddiy pichoq), keys ochishda **Tez ochish** va **O‘tkazib yuborish**.
- **40 ta qurol skini** (atlas, suzani, koshin naqshlari ham bor) va **12 ta agent** (personaj kiyimi).
- **Inventar:** skinni jihozlash, sotish; **Do‘kon:** har kuni yangilanadigan takliflar.
- Jihozlangan skin qo‘lingizdagi qurolda, agent esa qo‘l/yeng va soyangizda ko‘rinadi. Botlar ham har xil agent kiyimida.

## Rank, Prime va reyting

Bosh menyuda ismingiz, rankingiz (Bronza → Kumush → Oltin → Platina → Olmos → Afsona → Qumtepa Qiroli), reytingingiz va darajangiz. G‘alaba reytingni oshiradi, mag‘lubiyat tushiradi. 5-darajada **★ PRIME** ochiladi (o‘yin pullari +20%). **Reyting jadvali**da siz va 40 ta AI raqib.

## Boshqaruv

| Tugma | Vazifa |
|---|---|
| W A S D | Yurish |
| Sichqoncha | Nishon olish, otish; o‘ng tugma — AWP optikasi |
| Space (bosib turish) | Bunnyhop |
| Ctrl yoki C | Cho‘kkalash |
| Shift | Sekin yurish |
| R | Qayta o‘qlash |
| 1–3, Q, g‘ildirak | Qurol tanlash |
| 4 | Granatalar (qayta bosing — keyingisi) |
| 5 | C4 bomba — nuqtada sichqonchani bosib turing |
| E | Qurol olish; bosib turish — bombani zararsizlantirish |
| G / F | Qurolni tashlash / ko‘zdan kechirish |
| V | Kamera: 1-shaxs / 3-shaxs (orqadan ko‘rinish) |
| B | Xarid menyusi |
| Tab | Hisob jadvali |
| Esc | Pauza |

## Telefonda

Telefonni gorizontal holatga burang. Chap tomonda joystik, ekranning bo‘sh joyini surib qaraysiz, «OTISH» tugmasini bosib turib ham nishonni surish mumkin.

**Giroskop:** telefonni burib nishonga olasiz (Doim / Faqat otganda / O‘chiq, alohida sezgirlik) — «Tugmalarni joylashtirish» oynasida.

**Tugmalarni o‘zingizga moslash:** Pauza (II) yoki Sozlamalar → «Tugmalarni joylashtirish». Tugmani bosib, kerakli joyga suring; pastdagi panelda hajmini o‘zgartiring yoki yashiring. Shu yerda tugmalar ko‘rinishi (shaffofligi), ekran sezgirligi, qotgan/suzuvchi joystik va avto-otish bor. «SAQLASH» — joylashuv telefoningizda saqlanadi.

Texnologiya: [three.js](https://threejs.org) r128, sof JavaScript — yig‘ish (build) kerak emas.
