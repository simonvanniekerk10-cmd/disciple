export const CHALLENGE_CATEGORIES = [
  {
    name: "Evangelism & Invitation",
    emoji: "🌍",
    challenges: [
      { number: 1, title: "Bring Someone to Church This Month", description: "Personally invite and bring at least one new person to a church service this month.", outcome: "One new person attends church through your invitation." },
      { number: 2, title: "Share Your Faith Intentionally", description: "Have an intentional gospel-centered conversation with someone outside the church.", outcome: "At least one meaningful faith conversation with a non-believer." },
      { number: 3, title: "Attempt to Lead Someone to Christ", description: "Identify someone open to the gospel and walk them through a clear presentation of salvation.", outcome: "One person hears a clear gospel presentation from you." },
      { number: 4, title: "Restore Three Disengaged People", description: "Reach out to three people who have drifted from church and attempt to reconnect them.", outcome: "Three disengaged people contacted and invited back." },
    ],
  },
  {
    name: "Team Development & Activation",
    emoji: "👥",
    challenges: [
      { number: 5, title: "Identify Four People Not Serving and Activate Them", description: "Find four people who are not currently serving and help them find a role.", outcome: "Four new people activated into serving roles." },
      { number: 6, title: "Develop One Emerging Leader Under You", description: "Invest intentionally in one person to grow their leadership capacity.", outcome: "One person shows measurable leadership growth." },
      { number: 7, title: "Delegate Something You Normally Do", description: "Hand off a responsibility to someone else and coach them through it.", outcome: "One task or responsibility successfully delegated." },
      { number: 8, title: "Build a Mini-Team of Three or More Around One Responsibility", description: "Create a small team around a specific task or ministry function.", outcome: "A functioning mini-team of 3+ people established." },
    ],
  },
  {
    name: "Pastoral Care & Shepherding",
    emoji: "🤝",
    challenges: [
      { number: 9, title: "Personally Connect With Every Person Under Your Care", description: "Reach out personally to every single person in your area of responsibility.", outcome: "100% of people under your care personally contacted." },
      { number: 10, title: "Resolve One Pastoral Issue Independently", description: "Handle a pastoral concern or issue without escalating it to your leader.", outcome: "One pastoral issue resolved through your leadership." },
      { number: 11, title: "Visit Someone in Crisis or Difficulty", description: "Make a personal visit to someone going through a tough time.", outcome: "One crisis or difficult visit completed." },
      { number: 12, title: "Reconcile Two People or Help Resolve a Conflict", description: "Step into a conflict situation and help bring resolution.", outcome: "One conflict situation addressed with a path to resolution." },
    ],
  },
  {
    name: "Leadership Courage & Culture",
    emoji: "🦁",
    challenges: [
      { number: 13, title: "Have One Difficult Conversation", description: "Address something you've been avoiding — speak truth in love.", outcome: "One difficult conversation had with grace and clarity." },
      { number: 14, title: "Challenge Someone to Rise Higher", description: "Identify someone with untapped potential and call them up.", outcome: "One person challenged and inspired to step up." },
      { number: 15, title: "Address a Cultural Issue in Your Area", description: "Identify and begin to shift a negative cultural pattern in your team or ministry.", outcome: "One cultural issue identified and actively addressed." },
      { number: 16, title: "Lead a Visible Moment in Church", description: "Step up to lead something publicly — a prayer, announcement, testimony, or segment.", outcome: "One visible leadership moment in a church gathering." },
    ],
  },
  {
    name: "Personal Formation & Discipline",
    emoji: "🔥",
    challenges: [
      { number: 17, title: "Fast One Day Per Week for the Month", description: "Commit to fasting one full day each week for the entire month.", outcome: "Four days of fasting completed throughout the month." },
      { number: 18, title: "Establish a Consistent Daily Devotion Time", description: "Build and maintain a daily devotion habit every single day of the month.", outcome: "30 consecutive days of devotion logged." },
      { number: 19, title: "Read One Book and Write a Summary", description: "Read a leadership or spiritual growth book and write a one-page summary.", outcome: "One book read with a written summary." },
      { number: 20, title: "Wake 30 Minutes Earlier Daily to Pray", description: "Adjust your routine to wake 30 minutes earlier every day to spend time in prayer.", outcome: "30 days of early morning prayer completed." },
    ],
  },
];

export function getChallengeByNumber(num) {
  for (const cat of CHALLENGE_CATEGORIES) {
    const found = cat.challenges.find((c) => c.number === num);
    if (found) return { ...found, category: cat.name };
  }
  return null;
}

export function getCategoryForChallenge(num) {
  for (const cat of CHALLENGE_CATEGORIES) {
    if (cat.challenges.find((c) => c.number === num)) return cat.name;
  }
  return null;
}