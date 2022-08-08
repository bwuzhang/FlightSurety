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
        display_flight([
          {
            label: "Flight",
            error: error,
            value:
              result.flight + " " + result.timestamp + " " + result.airline,
          },
        ]);
      });
    });
  });
})();

function display_flight(results) {
  if (!results[0].error) {
    let displayDiv = DOM.elid("flight-wrapper");
    let section = DOM.section();

    results.map((result) => {
      let row = section.appendChild(DOM.div({ className: "row top-20" }));
      row.appendChild(
        DOM.label(
          { className: "form" },
          result.error ? String(result.error) : String(result.value)
        )
      );
      row.appendChild(DOM.input({ type: "text", id: "value" }));
      row.appendChild(DOM.btn({ className: "btn btn-primary" }, "Buy"));
      row.appendChild(DOM.btn({ className: "btn btn-secondary" }, "Calculate"));
      row.appendChild(DOM.btn({ className: "btn btn-success" }, "Get Paid"));
      section.appendChild(row);
    });
    displayDiv.append(section);
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
  });
  displayDiv.append(section);
  console.log(section);
}
