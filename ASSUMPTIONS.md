

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
