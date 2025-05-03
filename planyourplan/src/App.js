//obtained function names from: https://developer.mozilla.org/en-US/

import React, {useEffect, useState} from "react";

let channel = new BroadcastChannel("pollyourplan"); //BroadcaseChannel API: syncs across tabs

// Generate or retrieve a unique user ID per tab (using sessionStorage)
function getUserId () {
  let id = sessionStorage.getItem("user"); //sessionStorage is part of the Web Storage API. It's built into moderns Browsers like Chrome, etc. to store data on the client side
  if (!id) { 
    id = crypto.randomUUID(); //generates a unique ID string
    sessionStorage.setItem("user", id); 
  }
  return id;
};

function App () {
  let [polls, setPolls] = useState(() => { //initialize polls state
    let storedPolls = localStorage.getItem("polls"); //try to get saved polls from localStorage (API)
    return storedPolls ? JSON.parse(storedPolls) : []; //if found, parse and return them, else return empty array
  });
  let [title, setTitle] = useState(""); 
  let [date, setDate] = useState("");
  let userId = getUserId();

  //listen for poll updates from other tabs and update the poll list
  useEffect(() => {
    channel.onmessage = (event) => { //BroadcastChannel API used here to receive messages
      if (event.data.type === "update_polls") {
        setPolls(event.data.polls);
      }
    };
  }, []);

  //broadcast new polls and save them locally
  function broadcastPolls (new_polls) {
    localStorage.setItem("polls", JSON.stringify(new_polls)); //Web Storage API used here to save the polls
    channel.postMessage({type: "update_polls", polls: new_polls}); //BroadcastChannel API used here to send messages
  };

  //create a new poll
  function createPoll () {
    if (!title || !date) {
      return;
    }
    let new_poll = {
      id: crypto.randomUUID(),
      title,
      date,
      responses: {},
      confirmed: false,
    };
    broadcastPolls([new_poll, ...polls]); //copy current polls into a new array so that React re-renders.
    setTitle("");
    setDate("");
  };

  //vote on a poll
  function vote (pollId, response) {
    let updated = [];
  for (let i = 0; i < polls.length; i++) {
    let poll = polls[i];
    if (poll.id === pollId && !poll.confirmed) {
      let newPoll = {
        id: poll.id,
        title: poll.title,
        date: poll.date,
        confirmed: poll.confirmed,
        responses: Object.assign({}, poll.responses),
      };
      newPoll.responses[userId] = response;
      updated.push(newPoll);
    } else {
      updated.push(poll);
    }
  }
  broadcastPolls(updated);
}

  //confirm a poll and open Google Calendar event URL
  function confirm (id) {
    let updated = [];
  for (let i = 0; i < polls.length; i++) {
    if (polls[i].id === id) {
      updated.push({
        id: polls[i].id,
        title: polls[i].title,
        date: polls[i].date,
        responses: polls[i].responses,
        confirmed: true,
      });
    } else {
      updated.push(polls[i]);
    }
  }
  
    broadcastPolls(updated);
  
    let poll = updated.find((poll) => poll.id === id);
    let calendarURL =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(poll.title)}` +
      `&dates=${poll.date.replace(/-/g, "")}T190000Z/${poll.date.replace(/-/g, "")}T200000Z` +
      `&details=${encodeURIComponent("Group plan event")}` +
      `&location=${encodeURIComponent(poll.title)}`;
    window.open(calendarURL, "_blank");
  };

  //reset the app by clearing the data and broadcast
  function deletePolls () {
    localStorage.clear();
    sessionStorage.clear();
    setPolls([]);
    channel.postMessage({type: "update_polls", polls: []});
  };

  return (
    <div className="app">
      <h1>PollYourPlan</h1>
      <button onClick={deletePolls} style={{marginBottom: "1rem"}}>
        Delete Polls
      </button>

      {/*form for poll*/}
      <div className="create-poll">
        <input
          type= "text"
          placeholder= "Location & Occasion"
          value={title}
          onChange={(event) => setTitle(event.target.value)} //event for when the user types the input
        />
        <input
          type= "date"
          value={date}
          onChange={(event) => setDate(event.target.value )} //event for when the user selects the date
        />
        <button onClick={createPoll}>
           Create Poll 

        </button>
      </div>

      {/*display all polls*/}
      <div className="polls">
        {polls.map((poll) => (
          <div key={poll.id} className="poll">
            <p>
              <strong>{poll.title}</strong> on {poll.date} {/*strong to make it bold*/}
            </p>

            <div className= "responses">
              {poll.confirmed ? (
                <p className= "confirmed">Confirmed! 🎉</p>
              ) : (
                <>
                  <button onClick={() => vote(poll.id, "yes")}>
                    Yes
                  </button>
                  <button onClick={() => vote(poll.id, "no")}>
                    No
                  </button>
                </>
              )}
            </div>

            <p>
              {Object.keys(poll.responses).length} response(s):{" "}
              {Object.values(poll.responses).join(", ")}
            </p>

            {!poll.confirmed &&
              Object.keys(poll.responses).length >= 2 && ( //at least 2 users responded
                <button onClick={() => confirm(poll.id)}>
                  Confirm
                </button>
              )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;