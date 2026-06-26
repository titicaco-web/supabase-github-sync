-- ─────────────────────────────────────────────────────────────
-- Givin · catalog v1
-- Adds catalog metadata and seeds three tiers of gifts:
--   tier 'free'  + gift_type 'digital'  → public domain, €0, no provider, no legal risk
--   tier 'trial' + gift_type 'trial'    → affiliate / revenue-share trial, €0 to us
--   tier 'paid'  + gift_type 'physical' → real-world reward via Tremendous
-- ─────────────────────────────────────────────────────────────

alter table gifts add column if not exists gift_type     text not null default 'physical'; -- digital | trial | physical
alter table gifts add column if not exists source_url    text;     -- digital: content URL · trial: affiliate URL
alter table gifts add column if not exists provider      text;     -- brand behind a trial
alter table gifts add column if not exists revenue_share boolean not null default false;
alter table gifts add column if not exists trial_days    integer;  -- nominal trial length (confirm live per provider)
alter table gifts add column if not exists notes         text;

-- Reclassify the original seed: flowers/coffee are real-world costs, not "free".
update gifts set gift_type = 'physical', tier = 'paid', value_cents = 1900 where slug = 'seasonal-bouquet';
update gifts set gift_type = 'physical', tier = 'paid', value_cents = 500  where slug = 'coffee-voucher';
update gifts set gift_type = 'physical' where slug in ('chocolate-box','gift-card-10','gift-card-25','gift-card-50');

-- ── FREE · public domain / open-licensed (gift_type = digital) ──
insert into gifts (slug, title, category, tier, gift_type, value_cents, currency, source_url, notes) values
  ('pg-ebook',        'A classic e-book',            'ebook',     'free', 'digital', 0, 'EUR', 'https://www.gutenberg.org',                 'Project Gutenberg — 70k+ public-domain titles'),
  ('standard-ebooks', 'A beautifully-set e-book',    'ebook',     'free', 'digital', 0, 'EUR', 'https://standardebooks.org',                'Standard Ebooks — carefully formatted classics'),
  ('open-library',    'Borrow any book',             'ebook',     'free', 'digital', 0, 'EUR', 'https://openlibrary.org',                   'Open Library / Internet Archive'),
  ('manybooks',       'Pick from ManyBooks',         'ebook',     'free', 'digital', 0, 'EUR', 'https://manybooks.net',                     'Free fiction & non-fiction'),
  ('wikibooks',       'An open textbook',            'ebook',     'free', 'digital', 0, 'EUR', 'https://www.wikibooks.org',                 'Open-content textbooks'),
  ('bookboon',        'A free business textbook',    'ebook',     'free', 'digital', 0, 'EUR', 'https://bookboon.com',                      'Business & study e-books (ad-supported)'),
  ('librivox',        'A free audiobook',            'audiobook', 'free', 'digital', 0, 'EUR', 'https://librivox.org',                      'LibriVox — volunteer-read public domain'),
  ('archive-audio',   'Archive audiobook',           'audiobook', 'free', 'digital', 0, 'EUR', 'https://archive.org/details/audio',         'Internet Archive audio'),
  ('lit2go',          'Lit2Go audiobook',            'audiobook', 'free', 'digital', 0, 'EUR', 'https://etc.usf.edu/lit2go/',               'Stories & poems, free'),
  ('musopen',         'Classical music',             'music',     'free', 'digital', 0, 'EUR', 'https://musopen.org',                       'Royalty-free classical recordings'),
  ('free-music-arch', 'A music playlist',            'music',     'free', 'digital', 0, 'EUR', 'https://freemusicarchive.org',              'Free Music Archive — CC-licensed'),
  ('jamendo',         'Indie music',                 'music',     'free', 'digital', 0, 'EUR', 'https://www.jamendo.com',                   'Free music with license'),
  ('ccmixter',        'Remixable music',             'music',     'free', 'digital', 0, 'EUR', 'http://ccmixter.org',                       'CC remix community'),
  ('archive-films',   'A classic film',              'film',      'free', 'digital', 0, 'EUR', 'https://archive.org/details/feature_films', 'Public-domain feature films'),
  ('openculture-film','Curated free movies',         'film',      'free', 'digital', 0, 'EUR', 'https://www.openculture.com/freemoviesonline', 'Open Culture movie list'),
  ('khan-academy',    'A learning track',            'learning',  'free', 'digital', 0, 'EUR', 'https://www.khanacademy.org',               'Khan Academy'),
  ('mit-ocw',         'A university course',         'learning',  'free', 'digital', 0, 'EUR', 'https://ocw.mit.edu',                       'MIT OpenCourseWare'),
  ('freecodecamp',    'Learn to code',               'learning',  'free', 'digital', 0, 'EUR', 'https://www.freecodecamp.org',              'freeCodeCamp')
on conflict (slug) do nothing;

-- ── TRIAL · affiliate / revenue-share (gift_type = trial) ──────
-- value_cents = 0 (the sender pays nothing); we may earn on conversion.
-- VERIFY each program's terms — some restrict incentivized/gifted signups —
-- and confirm the current trial length before relying on trial_days.
insert into gifts (slug, title, category, tier, gift_type, value_cents, currency, source_url, provider, revenue_share, trial_days, notes) values
  ('audible-trial',   'Audible trial',               'audiobook', 'trial', 'trial', 0, 'EUR', 'https://www.audible.com',           'Audible',          true, 30, 'Audiobook trial · cancel-reminder on'),
  ('blinkist-trial',  'Blinkist trial',              'audiobook', 'trial', 'trial', 0, 'EUR', 'https://www.blinkist.com',          'Blinkist',         true, 7,  'Book summaries — great for pros'),
  ('shortform-trial', 'Shortform trial',             'audiobook', 'trial', 'trial', 0, 'EUR', 'https://www.shortform.com',         'Shortform',        true, 5,  'In-depth book guides'),
  ('everand-trial',   'Everand trial',               'audiobook', 'trial', 'trial', 0, 'EUR', 'https://www.everand.com',           'Everand (Scribd)', true, 30, 'Books + audiobooks'),
  ('spotify-trial',   'Spotify Premium trial',       'music',     'trial', 'trial', 0, 'EUR', 'https://www.spotify.com/premium',   'Spotify',          true, 30, 'Music · cancel-reminder on'),
  ('apple-music-trial','Apple Music trial',          'music',     'trial', 'trial', 0, 'EUR', 'https://music.apple.com',           'Apple Music',      true, 30, 'Music trial'),
  ('youtube-premium', 'YouTube Premium trial',       'music',     'trial', 'trial', 0, 'EUR', 'https://www.youtube.com/premium',   'YouTube',          true, 30, 'Music + ad-free video'),
  ('linkedin-learning','LinkedIn Learning trial',    'learning',  'trial', 'trial', 0, 'EUR', 'https://www.linkedin.com/learning', 'LinkedIn Learning',true, 30, 'Professional courses'),
  ('skillshare-trial','Skillshare trial',            'learning',  'trial', 'trial', 0, 'EUR', 'https://www.skillshare.com',        'Skillshare',       true, 30, 'Creative & business classes'),
  ('coursera-plus',   'Coursera Plus trial',         'learning',  'trial', 'trial', 0, 'EUR', 'https://www.coursera.org',          'Coursera',         true, 7,  'University-grade courses'),
  ('masterclass-gift','MasterClass',                 'learning',  'trial', 'trial', 0, 'EUR', 'https://www.masterclass.com',       'MasterClass',      true, null,'Giftable membership'),
  ('headspace-trial', 'Headspace trial',             'wellbeing', 'trial', 'trial', 0, 'EUR', 'https://www.headspace.com',         'Headspace',        true, 14, 'Meditation'),
  ('calm-trial',      'Calm trial',                  'wellbeing', 'trial', 'trial', 0, 'EUR', 'https://www.calm.com',              'Calm',             true, 7,  'Sleep & focus'),
  ('nyt-trial',       'New York Times trial',        'reading',   'trial', 'trial', 0, 'EUR', 'https://www.nytimes.com',           'NYT',              true, null,'News subscription trial'),
  ('economist-trial', 'The Economist trial',         'reading',   'trial', 'trial', 0, 'EUR', 'https://www.economist.com',         'The Economist',    true, null,'Business news'),
  ('medium-trial',    'Medium membership trial',     'reading',   'trial', 'trial', 0, 'EUR', 'https://medium.com/membership',     'Medium',           true, null,'Unlimited articles'),
  ('notion-trial',    'Notion Plus trial',           'tools',     'trial', 'trial', 0, 'EUR', 'https://www.notion.so',             'Notion',           true, null,'Productivity'),
  ('canva-pro-trial', 'Canva Pro trial',             'tools',     'trial', 'trial', 0, 'EUR', 'https://www.canva.com',             'Canva',            true, 30, 'Design tool'),
  ('grammarly-trial', 'Grammarly Premium trial',     'tools',     'trial', 'trial', 0, 'EUR', 'https://www.grammarly.com',         'Grammarly',        true, 7,  'Writing assistant')
on conflict (slug) do nothing;
