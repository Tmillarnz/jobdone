

## Phase 2: shell and Painter

- Painter Premium (confirmed by Tim): the Premium paint rates ship unset and are set in Settings, under Rates. Value ships with v1's rates: walls $18/m², ceiling $16/m², trim $8/lm, door $85. Wallpaper strip $12/m² and hang $18/m² ship in both coatings, because v1 does not tie them to a coating. The timber window frame rate ships unset in both (v1 has none).
- `Trade.rateSetNoun` is added ("Coating", "Roof system") so the shell can label rate sets without branching on a trade.
- `FieldDef` carries `group`, `help`, `showIf`, `say`; `AreaKind` carries `plan` and `spokenDims`. All are schema the shared form, Draw and Talk read.
- An area can carry its own rate set (the brief's `Area.rateSetId`): a room can be Premium on a Value job.
- Painter room has scope switches for ceiling, skirting and scotia, all on by default, so a room without scotia does not get a scotia line.
- Skirting and scotia are separate lines, both priced on the trim rate.
- A flagged slider needs its width and height typed. Neither has a default. With either missing nothing is deducted and Check says the size is missing.
- A room entered as wall lengths has no floor area unless one is typed, so it gets no ceiling line until then.
- A wall-length list is entered one box per wall, because the phone decimal keypad has no space or comma.
- Wallpaper quantity defaults to the rounded wall m² after any slider deduction.
- A line with a quantity that rounds to 0 is not produced.
- The Estimate brings lines up to date with the measurements and current rates each time it opens. Unedited lines pick up rate changes; edited lines do not.
- An edited takeoff line has "Reset to takeoff". A flagged (orphaned) line has "Remove". Manual lines can be removed. An unedited takeoff line cannot be deleted; change the measurements or scope instead.
- A quantity typed on the Estimate is rounded by its unit (m² and lm to 1 decimal).
- Deleting a rate set leaves jobs that used it showing "set rate" until another is chosen.
- Painter suggested extras (the brief gives none): Access, Scaffold, Furniture moving, Plaster repairs, Travel.

## Phase 3: Quote

- "Sent quotes" lists quotes marked sent, then any that are confirmed but not yet sent, so a confirmed quote cannot get lost.
- Mark sent can be undone ("Mark not sent").
- The business header (name, address, phone, email) and bank line on a quote come from Settings as they are when it is viewed or printed. The snapshot fixes lines, extras, GST treatment, GST number, terms and site name, as the brief lists.
- The bank line prints on quotes, not on estimates. An estimate prints with "Estimate only, not an offer." and no terms.
- Confirming a quote with unset rates is allowed after a warning; those lines show $0.00.
- A job can be confirmed more than once. Each confirm is a new quote with its own number; earlier quotes are kept.
- Deleting a job keeps its confirmed quotes.
- Print layout is new (v1's was not used): business details top left, label, number and date top right, site, a four-column table, totals, terms.

## Phase 4: Draw, Talk, photos

- Draw writes the plan's union area and outline perimeter (2 decimals) into the area's own fields and keeps the rectangles on `Area.plan`. The numbers stay editable afterwards; if they are retyped, the typed numbers price the job and the saved picture is not redrawn.
- Draw snaps to a 50 mm grid and to nearby edges of other rectangles. A typed length is taken exactly, to the millimetre.
- If drawn rectangles do not all touch, Draw warns and counts each piece.
- The outline perimeter includes the edge of any enclosed hole.
- Talk understands "4 by 3.6 by 2.4", "length 4", "4 long", "two doors" and a named flag ("ranch slider"). It reads number and yes/no fields only; choices such as wallpaper are typed. Anything not heard is listed and left for typing.
- Talk uses the browser's Web Speech API, as the brief specifies. On most phones the browser sends the audio to its own speech service, so Talk needs a connection even though the rest of the app does not. The app itself makes no network calls. Where the API is missing, the Talk panel is not shown.
- Talk asks for `en-NZ` recognition.
- Photos are shrunk to 1600 px on the long edge (JPEG) before being stored, to keep the device from filling up.
- Photos attach to the job, not to an area.

## Phase 5: Plumber, Roofer, Builder

- None of these trades has rates in v1, so every rate ships unset and shows "set rate" (brief section 10, item 7).
- Plumber: each fixture is its own entry (fixture, point type, how many), and pipe runs are a second kind of entry. Name the entry after where it is, for example "Bathroom".
- Plumber: grade (standard or specified) is offered on washing machine, dishwasher and hot water cylinder. It shows on the line and does not change the rate key, which stays `fixture.pointType` as the brief says.
- Plumber and Builder ship one rate set each, "Standard". More can be added in Settings.
- Roofer: the pitch has no default. Until a pitch is chosen (or a factor typed) there is no roofing line, and Check says "set the pitch". Flat (0°) is a real choice. This avoids quietly pricing a pitched roof as flat.
- Roofer: pitch choices are 0, 3, 5, 8, 10, 12, 15, 18, 20, 22.5, 25, 27.5, 30, 35, 40, 45, 50 and 60 degrees. Any other pitch is entered as a typed factor.
- Roofer: flashings can be entered by length, each, or both. Ridge, hip, valley, barge, gutters, flashings and downpipes sit on the roof plane they belong to.
- Builder: work items are tick boxes on the room or elevation. A ticked item makes a line starting at the matching measured figure; change the quantity on the Estimate and it is kept as an edited line.
- Builder room items: wall lining (wall m²), ceiling lining (ceiling m²), decking (floor m²), framing (perimeter), trim (perimeter). Both lining items use the one lining rate. Elevation items: cladding (gross m²), lining (gross m²), framing (width). Labour is typed hours on either.
- Builder: door and window counts make "each" lines priced on door and window rates.
- Builder suggested extras (the brief gives none): Materials, Variation, Scaffold, Rubbish removal, Travel.

## Phase 6: PWA and How to

- The service worker precaches every built file on first load and updates itself when a new build is published. Nothing is fetched at runtime.
- "Add to Home Screen" appears as a button on How to when the browser offers its install prompt (Chrome, Edge). Safari on iPhone has no such prompt, so How to gives the Share steps.
- The app icon is a plain placeholder mark (a "U" on charcoal). Replace `public/icon.svg` and the PNGs beside it with the real logo.
- The app name is UteDesk and quote numbers start `UD-`, as the brief specifies, although the repo is `jobdone`.
- `enabledTrades` lives in `src/config.ts`.
- Hosting and deployment are not configured, as instructed. `npm run build` writes the static site to `dist/`. A PWA needs to be served over HTTPS to install and work offline.
- There is no backup or export (out of scope in the brief). How to tells the operator that clearing site data deletes their work.

## Not verified on a real device

- Talk was tested through its parser only. The test browser has no speech recognition, so the microphone flow has not been exercised on a phone.
- Draw was tested with a mouse in a phone-sized browser, not with a finger on glass.
- Install and offline were tested in desktop Chromium, not on iOS Safari.
