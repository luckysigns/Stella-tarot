# Tarot Deck Artist Program, commercial model and terms

Working document for the Orla call and for artist recruitment generally.
Not legal advice. The licence terms need attorney review alongside the
affiliate agreement.

---

## 1. The shape of the deal, in one line

Artists licence you **digital usage only** of decks that already exist. They keep
copyright and every other right. You handle the infrastructure, the file prep,
the reader experience, and payments. Revenue is shared, not bought out.

Orla told you the model herself: *"you don't need all rights to a deck, you need
just the digital usage."* She is right, and agreeing with her quickly is worth
more than negotiating.

---

## 1b. The business model, revised

The tarot app is **free**. There is no tarot subscription. Revenue on the tarot
side comes from digital deck sales only, plus a small referral fee on physical
decks.

Astrological tarot readings, the ones that draw on the user's birth chart, are
part of the **Stellar subscription**. A user with no Stellar subscription still
gets the whole free tarot app: decks, spreads, meanings, readings. What they do
not get is the chart-linked layer.

This is a stronger position than it first looks, for three reasons.

**It aligns you with the artists.** You can say honestly: the app is free, we
make money only when you make money. That is the single most persuasive
sentence available to someone recruiting independent artists, and it is true.

**It makes tarot a funnel into Stellar rather than a competing product.** An
artist's audience installs a free app, buys her deck, and some fraction of them
want the astrological readings and subscribe to Stellar. The artist earns on
both ends.

**It answers Orla's opening objection.** She said her followers are tarot people,
not astrology people, so the affiliate programme is not a fit. Under this model
she does not need them to be astrology people. She earns on deck sales to a pure
tarot audience, and anyone who happens to cross over into Stellar is upside.

---

## 2. Revenue: digital decks

**Recommended split: 70% artist / 30% platform on the sale price.**

Stripe fees come out of your 30%, so the artist gets a clean 70% of the sticker
price with nothing deducted. That costs you about 3.5 points and removes the
single most common source of creator distrust ("what are all these deductions?").

Why 70/30 is the right number:
- It matches Kindle Direct Publishing, which almost every independent creator
  already knows and accepts as fair
- It is more generous than the App Store (30% platform on a much larger service)
- It is defensible in public if an artist posts the terms, which they will

**Recommended uplift: 80% when the buyer arrives through the artist's own
referral link.**

The logic is honest and easy to explain: when you supply discovery, you earn the
full 30%. When the artist brings their own audience, you only supplied
infrastructure, so you take 20%. It also merges the artist programme with the
affiliate programme instead of running two separate systems.

**Decided: no founding tier.** Every artist gets the same deal. The thing that
makes an early artist safe is not a better rate, it is clause 16.2 of the
agreement: nobody's royalty rate can be cut by a later change of terms. That
protection applies to everyone, which is a cleaner sentence to say out loud and
leaves nothing to unwind as the programme grows.

**Decided: the artist sets the price, anywhere from $4.99 to $25.** Indie physical
decks run roughly $35 to $60, so a digital edition should be clearly cheaper but
not disposable. For reference on why the low end hurts, at $4 Stripe takes about
42 cents, which is over 10% of the transaction, and you net about 78 cents. At
$12 you net about $2.95. Say that to an artist who asks, then let them choose.
Never auto-enrol decks into a subscription bundle without explicit opt-in;
artists distrust streaming economics for good reason, and offering per-deck
purchase first is a differentiator.

**How the 80% is determined.** Referral link, not a code, and the credit binds to
the buyer's **account**, not their browser. `?ref=CODE` lands in browser storage,
then on first sign-in it is written permanently to `referrals`, whose `user_id` is
UNIQUE so the first code wins forever. Since a purchased deck belongs to an
account, every buyer has one.

This matters more than it sounds. Browser-only tracking would have leaked badly:
Safari purges script-writable storage after about seven days of no interaction,
Instagram and TikTok open links in their own in-app browser so a later purchase in
Safari is a different storage bucket, and any device change loses it. An artist
promoting hard would have seen mostly 70% rows and concluded she was being shaved.
An unreliable uplift is worse than no uplift. Binding to the account reduces the
fragile window to the gap between clicking the link and signing up, usually
minutes.

Built and live in Astra as of this round, along with the `/sb` proxy fix that had
been silently breaking every Supabase call on tarot.stellarastro.app. Still to
build: Stripe checkout and the webhook that calls
`artist_royalty_rate(artist_code, referring_code)`.

**Cross-referral rule.** Artist A's link, Artist B's deck: B still gets 70%, and
A's commission comes out of your share, not B's. Suggested internal split is
70 artist / 10 referrer / 20 platform. Keep that number out of the artist
agreement so you can tune it without amending contracts.

**Buyers keep what they buy.** A purchased deck stays in the buyer's library
even if the artist later leaves the platform. This must be stated to the artist
up front, because it is the one term that surprises people afterwards. It is
also the term that makes buying feel safe.

---

## 3. Revenue: physical decks

You asked about taking a commission for sending buyers to the artist's shop.
Here is the honest arithmetic before the recommendation.

A $45 indie deck costs roughly $12 to $18 to print in a small run, before
shipping, packaging and payment fees. The artist's actual profit is often $15 to
$20. A 10% commission on the sale price is $4.50, which is a quarter of their
real margin. Artists know these numbers exactly. Asking for that cut reads very
differently to them than it does on a spreadsheet.

**5% is the right number, and it is defensible.**

Ten percent would take a quarter of the artist's real margin and read as grabby.
Five percent takes roughly a tenth, sits at the low end of normal physical-goods
affiliate rates, and is easy to justify: you built the shopfront, the card
browser and the audience path that produced the sale.

Frame it as what it is, a **referral fee, not a cut of their art**. The artist
sets their own price, keeps the customer, keeps the relationship, and owes 5%
only on sales the app demonstrably sent.

**The practical problem is tracking, not the rate.**

Five percent of a $45 deck is $2.25. At current volume this is perhaps ten or
twenty dollars a month, against real administrative work for the artist. Do not
let a small fee create friction in a relationship worth much more. Three ways to
handle it, in order of preference:

1. **Join their existing affiliate programme** if they have one. Many indie
   creators sell through Shopify and already run one, or can enable one in an
   afternoon. Zero work for you, standard for them.
2. **Discount-code tracking.** The buyer uses a code at the artist's shop that
   gives them something small (free shipping, 5% off), and the artist reports and
   pays 5% monthly. It self-tracks, the buyer benefits, and it needs no
   integration.

**Decided: no waiver, but the fee is gated on tracking.** Clause 9.3 of the
agreement says the fee applies only to sales that can actually be traced, by a
method agreed in writing first, and that no tracking in place means no fee. That
gets you the same practical outcome as a waiver without giving anything away: the
principle is on the record, it applies to every artist equally, and you are not
chasing anyone for two dollars a month before there is a way to measure it.

**Say it in the first email, not the contract.** The fee has to appear in the
opening conversation. A 5% line discovered later, in a document someone has
already emotionally agreed to, reads as something you hid. Stated up front with
the tracking gate attached, it reads as fair.

**Show the traffic either way.** Her dashboard should display how many people
the app sent to her shop, whether or not any fee is being collected. Proving the
traffic is what makes the 5% feel earned.

---

## 4. Donations and tips

Skip donation-as-payment. A tip jar signals that the art is optional to pay for,
and it underprices work that artists spent years on. Sell the deck at a real
price with a fair split.

An optional "add a tip for the artist" at checkout is fine as a small extra, with
100% of the tip going to the artist. Nice to have, not the model.

---

## 5. The AI question, and it matters more than you think

Orla was emphatic and she is describing a real market condition, not a personal
preference. She has to sign statements that her illustrations are not AI
generated in order to sell into shops.

**Do not ship the AI-generated astrology deck.** If artists open your app and
see AI art sitting next to real artists' work, recruitment is over before it
starts. The artists you want are exactly the people most hostile to it. One
screenshot in a tarot subreddit undoes months of outreach.

Three legitimate ways to solve the placeholder problem instead:

1. **Rider-Waite-Smith is public domain.** The 1909 Pamela Colman Smith artwork
   is out of copyright in the US (pre-1929 publication) and in life-plus-70
   countries since 2022 (Smith died in 1951). It is the deck almost every reader
   learns on. Shipping it as the free default deck is free, legal, instantly
   recognisable, and it demonstrates the reader experience to artists you are
   pitching. Confirm with your attorney, but this is widely relied upon.
2. **Commission exactly one house deck, properly paid.** The single case where
   commissioning makes sense is a signature deck you own. Everything else is
   licensed.
3. **Ship with fewer decks.** Two real decks beats twenty placeholder ones.

Then make the no-AI position public: a line on the site saying every deck is by
a named human artist. That is a genuine differentiator in this market and it
recruits for you.

---

## 6. Licence terms, the outline

What the artist agreement needs to cover. Orla asked specifically about
**usage rights, scope and compensation**, so these are the sections to have
answers for on the call.

**Grant of licence**
- Non-exclusive, worldwide, digital display and reproduction **within the app
  only**
- Not sublicensable except to service providers needed to run the app (hosting,
  CDN, payments)
- No print rights, no merchandise rights, no derivative works

**What the artist keeps**
- Copyright and all moral rights
- All print, merchandise, licensing and resale rights
- The right to licence the same deck to any other platform (non-exclusive)

**No AI-generated deck art, scoped narrowly and truthfully**
- Every deck in the app is by a named human artist. No AI-generated decks are
  created, bought, or sold
- The artist's images are never used to train or fine-tune an image model
- No AI variations, upscales or restylings are generated from the artwork
- **The clause stops there on purpose.** You use AI to build the apps, to write,
  and possibly to translate. A blanket "no AI" promise would be false, and being
  caught in a false promise on this specific subject is worse than never making
  it. The three promises above are true and will stay true.
- If an artist asks directly: the artwork is all human, and you use AI tooling to
  build the app itself the way every developer does. Then move on.
- **Consequence to hold on to:** clause 2.1 means the AI-generated `astro` deck
  can never ship inside the app while any licensed artist is in it. It stays at
  `ready:false` or it gets drawn by a human. This is now a contractual
  commitment, not just a recruitment preference.

**Attribution and traffic**
- Artist name on every card view and on the deck page
- Link to the artist's shop and profile from inside the app
- Artist approves how the deck is presented: card back, crop, resolution

**Compensation**
- 70% of the sale price, or 80% on sales from the artist's own referral link
- Artist sets the price, $4.99 to $25
- Referral is tracked by link, not by a code the buyer types, and no discount is
  needed for it to work
- Where a third party's link sends a buyer to this artist's deck, the artist
  still gets 70% and the referrer is paid from the platform share
- No deductions; Stripe fees come out of the platform share
- Paid monthly on the last day of the month, no minimum
- Live dashboard showing sales, royalties, referral clicks and payout history
- Royalty rates cannot be reduced by a later change of terms, for any artist

**File preparation**
- The platform prepares the files. Artist supplies high-resolution images in any
  reasonable format and the platform handles sizing, naming and card mapping.
  This directly answers Orla's point that average users cannot prepare files,
  and it is a real service you provide.

**Card meanings and booklet**
- If the artist supplies their own card interpretations, those are licensed too
  and displayed with their deck (this is the "no more flipping through the
  booklet" feature)
- If not, the platform's generic meanings are used, clearly marked as not the
  artist's

**Term and exit**
- Initial term two years, then rolling
- Either party may exit on 60 days' notice, for any reason
- On exit the deck is removed from sale immediately; existing purchasers retain
  access to what they bought
- Immediate takedown right for the artist if their work is misused

**Protection**
- Reasonable technical measures against bulk extraction of images
- Be honest in the document: no web app can prevent screenshots, and claiming
  otherwise damages trust. Say what you will actually do.

---

## 7. What to say on the call with Orla

She asked three things. Have these ready as plain sentences.

**Usage rights:** digital display inside the app only, non-exclusive, she keeps
copyright and every other right, no AI-generated decks in the app and her images
never used to train a model or generate variations, and she can leave on 60 days'
notice.

**Scope:** her existing published decks, plus the oracle deck when it is ready,
plus anything future if she wants. You prepare the files. Her name and shop link
on every card. Her own card meanings included if she wants to supply them.

**Compensation:** 70% of digital sales, 80% when her audience buys through her
own link, she sets the price between $4.99 and $25, paid monthly with no minimum and
no deductions. Tracking is a link, not a code, so her audience types nothing. The
tarot app itself is free, so you earn only when she earns. On physical decks the
programme fee is 5% of sales the app sends her, applied only where a tracking
method has been agreed, and nothing is owed until one is. Artists earn nothing on Stellar
astrology subscriptions (decided 1 Oct 2026); their dashboard is /artist.

**Two things to ask her:**
1. What would make her comfortable putting her art into a digital product, and
   what has made her say no before? She has been approached already; her reasons
   for declining are the most valuable information in the call.
2. What tracking would she actually accept on the physical side? If she already
   runs an affiliate programme this is a two-minute answer, and it turns the 5%
   from an abstract term into a solved detail.

---

## 8. How this connects to the dashboard

An artist is two things at once: a licensor earning royalties on their deck, and
an affiliate earning commission on traffic they send. One dashboard should show
both:

- Deck sales and royalties, per deck
- Affiliate clicks, signups and subscription commission
- Physical shop click-throughs, shown as a number the artist can see whether or
  not the 5% fee is active, because it proves the traffic you are sending
- Stellar subscription commissions from their referrals
- Payout history

This is the Stellar affiliate system with a decks layer added, not a separate
build.
