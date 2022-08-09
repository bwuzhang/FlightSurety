import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

(async () => {
  let result = null;

  let contract = new Contract("localhost", () => {
    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result);
      display("Operational Status", "Check if contract is operational", [
        { label: "Operational Status", error: error, value: result },
      ]);
    });

    // User-submitted transaction
    DOM.elid("submit-oracle").addEventListener("click", () => {
      let flight = DOM.elid("flight-number").value;
      let timestamp = DOM.elid("time-stamp").value;
      // Write transaction
      contract.fetchFlightStatus(flight, timestamp, (error, result) => {
        display("Oracles", "Trigger oracles", [
          {
            label: "Fetch Flight Status",
            error: error,
            value: result.flight + " " + result.timestamp,
          },
        ]);
      });
    });
    DOM.elid("register-flight").addEventListener("click", () => {
      let flight = DOM.elid("flight-number").value;
      let timestamp = DOM.elid("time-stamp").value;
      // Write transaction
      contract.registerFlight(flight, timestamp, (error, result) => {
        display_flight(
          [
            {
              label: "Flight",
              error: error,
              value:
                result.flight + " " + result.timestamp + " " + result.airline,
            },
          ],
          contract
        );
      });
    });
  });
})();

function display_flight(results, contract) {
  if (!results[0].error) {
    let displayDiv = DOM.elid("flight-wrapper");
    let section = DOM.section();

    let index = getRandomInt(0, 10000000);
    results.map((result) => {
      let row = section.appendChild(DOM.div({ className: "row top-20" }));
      row.appendChild(
        DOM.label(
          { className: "form", id: "info-" + index.toString() },
          result.error ? String(result.error) : String(result.value)
        )
      );
      row.appendChild(
        DOM.input({ type: "text", id: "value-" + index.toString() })
      );
      row.appendChild(
        DOM.btn(
          { className: "btn btn-primary", id: "buy-" + index.toString() },
          "Buy"
        )
      );

      row.appendChild(
        DOM.btn(
          {
            className: "btn btn-secondary",
            id: "calculate-" + index.toString(),
          },
          "Calculate"
        )
      );
      row.appendChild(
        DOM.btn(
          { className: "btn btn-success", id: "getPay-" + index.toString() },
          "Get Paid"
        )
      );
      section.appendChild(row);
    });
    displayDiv.append(section);

    // Button event listener
    DOM.elid("buy-" + index.toString()).addEventListener("click", () => {
      contract.buyInsurance(
        DOM.elid("info-" + index.toString()).innerText.split(" ")[2],
        DOM.elid("info-" + index.toString()).innerText.split(" ")[0],
        DOM.elid("info-" + index.toString()).innerText.split(" ")[1],
        DOM.elid("value-" + index.toString()).value,
        (error, result) => {
          display("Passenger", "", [
            {
              label: "Buy Insurance",
              error: error,
              value:
                result.flight +
                " " +
                result.timestamp +
                " " +
                DOM.elid("value-" + index.toString()).value.toString(),
            },
          ]);
        }
      );
    });
    DOM.elid("calculate-" + index.toString()).addEventListener("click", () => {
      contract.calculatePayment(
        DOM.elid("info-" + index.toString()).innerText.split(" ")[2],
        DOM.elid("info-" + index.toString()).innerText.split(" ")[0],
        DOM.elid("info-" + index.toString()).innerText.split(" ")[1],
        (error, result) => {
          display("Passenger", "", [
            {
              label: "Calculate payout",
              error: error,
              value:
                result.airline +
                " " +
                result.flight +
                " " +
                result.timestamp +
                " ",
            },
          ]);
        }
      );
    });
    DOM.elid("getPay-" + index.toString()).addEventListener("click", () => {
      contract.getPaid((error, result) => {
        display("Passenger", "Request Payout", [
          {
            label: "Request payout",
            error: error,
            value:
              result.insurer +
              " Payment request successful. Check server log for amount.",
          },
        ]);
      });
    });
  } else {
    display("Flights", "Register flights", [
      {
        label: "Flight",
        error: results[0].error,
        value:
          results[0].flight +
          " " +
          results[0].timestamp +
          " " +
          results[0].airline,
      },
    ]);
  }
}

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-4 field" }, result.label));
    row.appendChild(
      DOM.div(
        { className: "col-sm-8 field-value" },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
    if (result.error) {
      console.log(result.error);
    }
  });
  displayDiv.append(section);
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}
