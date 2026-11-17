<div align="center">
  <h1>DTZ-Puls — German exam prep in 12 languages</h1>
  <p><b>Daily lessons and free practice for the Deutsch-Test für Zuwanderer (A2–B1).<br>
  Built on the <a href="https://github.com/RuslanBaatyrbekov/pulse-learning">Pulse</a> engine: vanilla JavaScript, Supabase Auth + Postgres Row Level Security, static hosting.</b></p>

  <p>
    <a href="https://github.com/RuslanBaatyrbekov/dtz-puls/actions/workflows/ci.yml"><img src="https://github.com/RuslanBaatyrbekov/dtz-puls/actions/workflows/ci.yml/badge.svg" alt="ci"></a>
    <img src="https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript">
    <img src="https://img.shields.io/badge/Supabase-Auth_·_Postgres_·_Realtime-3FCF8E?logo=supabase&logoColor=white" alt="Supabase">
    <img src="https://img.shields.io/badge/i18n-12_languages_·_RTL-0a7a74" alt="12 languages">
    <img src="https://img.shields.io/badge/GitHub_Pages-static-222222?logo=github&logoColor=white" alt="GitHub Pages">
  </p>
</div>

---

## Why

An integration course class speaks a dozen first languages, but the exam is only in German.
Grammar explanations that a learner cannot read do not help, and generic apps do not train the DTZ format.
DTZ-Puls keeps every exam task in German and explains everything else in the learner's own language.

I built it to prepare for my own DTZ exam and to share with my classmates.

## Features

| | |
|---|---|
| **12 interface languages** | Русский, Українська, English, Türkçe, العربية, اردو, فارسی, Hrvatski, Srpski, မြန်မာ, Español, हिन्दी. Arabic, Urdu and Farsi render right-to-left; script fonts load only when chosen. Grammar rules, vocabulary and letter ideas are translated too. |
| **Daily lessons** | 31 lessons up to the exam date: a rule card, then about 10 tasks. Two official g.a.s.t. mock exams are scheduled on Saturdays. Max two new lessons per day. |
| **Free practice** | Seven sections drawn from the same task bank: cases and articles, word order, listening, reading, vocabulary, speaking (parts 1–3), writing. Your mistakes come first. |
| **Task types** | gap fill with chips, word order, multiple choice, listening (browser German voice, play/stop), reading, pair matching, speaking with timer and B1 model answer, letter builder with ideas and graded gaps. |
| **Habit mechanics** | ECG streak strip, streak freezes, XP levels, badges, heatmap, per-section progress. |
| **Sync and observer** | Same as Pulse: progress in localStorage and Postgres, last write wins; the course organiser sees every learner live. |
| **Content behind auth** | The course (328 tasks) lives in the database and is served to signed-in users only. The repository contains only the engine. |

## Quick start

1. Create a Supabase project (EU region) and run `schema.sql` in the SQL editor.
2. Run `content.sql` (the course, kept outside the repository).
3. Turn off sign-ups in **Authentication → Providers → Email**; create learner accounts in **Authentication → Users**.
4. Make yourself an observer:
   ```sql
   insert into public.observers (user_id) select id from auth.users where email = 'you@example.com';
   ```
5. Put the project URL and the anon / publishable key into `config.js`.
6. Enable **Settings → Pages → Deploy from a branch** (`main`, root).

## Course format

One JSON document: `rules` (translated), `weeks → days → cards + task ids`, and `bank` with seven sections.
Any explanation field is either a string or `{ "ru": …, "en": …, … }`; tasks reference rules by id.

```json
{ "id": "k1", "t": "fill", "s": "Ich fahre jeden Tag mit ___ Bus zum Kurs.",
  "a": ["dem"], "o": ["der","die","das","den","dem"], "r": ["dat_prep"], "e": "der Bus → mit dem Bus" }
```

## Disclaimer

A private, free learning project. Not official and not affiliated with BAMF, g.a.s.t. or telc. All tasks are original; official practice tests are only linked, never copied.

## License

MIT
