import { Screen } from '../components';
import { useInstall } from '../install';

export function HowTo() {
  const { install, installed } = useInstall();
  return (
    <Screen title="How to" back="/">
      <section class="card howto">
        <h2>Put it on your home screen</h2>
        {installed ? (
          <p>UteDesk is installed on this device.</p>
        ) : (
          <>
            {install && (
              <button class="btn primary block" onClick={() => void install()}>
                Add to Home Screen
              </button>
            )}
            <p>
              <strong>iPhone or iPad:</strong> open this page in Safari, tap Share, then Add to Home Screen.
            </p>
            <p>
              <strong>Android:</strong> open the browser menu and tap Install app or Add to Home screen.
            </p>
          </>
        )}
        <p>Once it has loaded once, it works with no signal. Jobs, quotes, rates and photos stay on this device.</p>
      </section>

      <section class="card howto">
        <h2>A job, start to finish</h2>
        <ol>
          <li>
            <strong>New job.</strong> Type the site. The street is enough. Pick the trade.
          </li>
          <li>
            <strong>Size it.</strong> Add a room, roof plane, fixture or elevation and enter the measurements.
          </li>
          <li>
            <strong>Check.</strong> Read the measured numbers and the calculated quantities against your tape. Go back to fix anything.
          </li>
          <li>
            <strong>Estimate.</strong> Every line shows quantity, rate and amount. Change any quantity or rate. Add extras.
          </li>
          <li>
            <strong>Quote.</strong> Confirm it to get a quote number. Copy it as text, or print or save it as a PDF. Send it yourself, then mark it sent.
          </li>
        </ol>
      </section>

      <section class="card howto">
        <h2>Three ways to size</h2>
        <p>
          <strong>Type</strong> the measurements into the boxes. This always works.
        </p>
        <p>
          <strong>Draw</strong> a plan from rectangles for odd shapes. Drag a corner until the metres match your tape, or type the exact length. Add a rectangle for each leg of
          the shape. The area counts overlaps once and the perimeter follows the outline.
        </p>
        <p>
          <strong>Talk.</strong> Tap "Say the sizes" and say, for example, "4 by 3.6 by 2.4, one door". You see what was heard and choose whether to use it. Anything missed, you
          type. Talk shows only on devices that support it, and on most phones it needs a connection.
        </p>
        <p>
          <strong>Photos</strong> are for reference only. They are never measured and do not print.
        </p>
      </section>

      <section class="card howto">
        <h2>Rates</h2>
        <p>Set your charge-out rates, excluding GST, in Settings under Rates. Each trade has one or more rate sets: coatings for painting, roof systems for roofing.</p>
        <p>A line with no rate shows "Set rate" and stays at $0.00. The app never makes up a price.</p>
      </section>

      <section class="card howto">
        <h2>Changing things later</h2>
        <p>Change a measurement and the estimate is recalculated. Lines you edited by hand, lines you added and extras are left alone.</p>
        <p>If you edited a line and its measurement is later removed, the line is kept and flagged so you can decide.</p>
        <p>A confirmed quote is fixed. To change it, change the job and confirm a new quote.</p>
      </section>

      <section class="card howto">
        <h2>GST</h2>
        <p>Turn GST on or off in Settings. When it is on, estimates and quotes show the total excluding GST, the GST and the total including GST, and print your GST number.</p>
      </section>

      <section class="card howto">
        <h2>Keeping your work</h2>
        <p>
          Nothing is backed up or sent anywhere. Clearing this browser's site data, or removing the app on some phones, deletes your jobs and quotes. Save important quotes as
          PDFs.
        </p>
      </section>
    </Screen>
  );
}
