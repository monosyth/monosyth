export type WeekendChoice = "attending" | "cant-make-it";

export type EventChoice = "attending" | "might-attend" | "cant-make-it";

export type RSVPOption<TValue extends string> = {
  value: TValue;
  label: string;
  description?: string;
};

export type EventQuestion = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  options: RSVPOption<EventChoice>[];
};

export type InterestOption = {
  slug: string;
  label: string;
  description: string;
};

export const welcomeMessage =
  "Come join the Sin, The Fun, The Adrenaline, & The Redemption...";

export const weekendPrompt =
  "Even if you can't make part of the trip, mark \"attending\" and we'll iron out the details after this.";

export const weekendOptions: RSVPOption<WeekendChoice>[] = [
  {
    value: "attending",
    label: "Attending",
    description: "I'm in for the weekend and will sort the final details below.",
  },
  {
    value: "cant-make-it",
    label: "Can't Make It",
    description: "I'm not able to make the trip this time.",
  },
];

export const rsvpNotes = [
  "Please select all events, brunches, and dinners you plan to attend.",
  "Deposits are required for all paid events to secure group seating.",
  "Restaurant RSVPs are required to reserve your seat at the table.",
  "All RSVPs and deposits must be submitted by June 10.",
  "If you are paying for the show, cabana, or concert, please send payment to Scott or Dallas.",
];

export const eventQuestions: EventQuestion[] = [
  {
    slug: "zuma-dinner",
    eyebrow: "Dinner reservation",
    title: "Dinner: Zuma, July 30th",
    description:
      "The birthday dinner on Thursday, July 30th is inside Cosmopolitan. Kickstarting the weekend!",
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description:
          'For all "maybe" answers on dining, I will be adding you. It is easier to cancel a seat instead of adding a seat with a large reservation.',
      },
      { value: "cant-make-it", label: "Can't Make It" },
    ],
  },
  {
    slug: "absinthe-show",
    eyebrow: "Show ticket",
    title: "Show: Absinthe, $150 per person, Caesars' Fairy Tent, July 30th",
    description:
      "This is one of Vegas's most popular shows on Thursday, July 30th. It is your typical dinner-and-a-show experience, with a 9:00pm show that usually runs 120 to 160 minutes. This is $150 per person, and a deposit is needed no later than June 10th for group seating.",
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description: "Decide by June 10th.",
      },
      { value: "cant-make-it", label: "Can't Make It" },
    ],
  },
  {
    slug: "poolside-cabana",
    eyebrow: "Pool day",
    title: "Poolside Cabana! ($70 ea.) Bellagio, Friday July 31",
    description:
      "Verona Cabana in Bellagio's pools. Dallas will be there as guests arrive. This is an $800 minimum spend for 8 total guests, and there are 6 open seats. First come, first served at $70 per person. 9:00am to 5:00pm with food and beverage service, plus shaded designated seating. Deposits are needed by June 10th.",
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description: "Decide by June 10th.",
      },
      { value: "cant-make-it", label: "Can't Make It" },
    ],
  },
  {
    slug: "sinners-dinner",
    eyebrow: "Themed dinner",
    title: "Sinners Dinner! (Themed) Friday, July 31",
    description:
      'This is the first themed dinner on Friday, July 31st: "Welcome to Sin!" at Bavette\'s Steakhouse inside Park MGM. Bring your dark side, and let\'s get wild. Dressing in theme is highly encouraged.',
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description: "Will be added to reservation.",
      },
      { value: "cant-make-it", label: "Can't Make It" },
    ],
  },
  {
    slug: "toca-madera-brunch",
    eyebrow: "Brunch",
    title: "Brunch! Toca Madera: Saturday, Aug. 1",
    description: "Toca Madera brunch on Saturday, Aug. 1 inside Aria.",
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description: "Will be added to reservation.",
      },
      { value: "cant-make-it", label: "Can't Make It" },
    ],
  },
  {
    slug: "pre-kelly-dinner",
    eyebrow: "Dinner reservation",
    title: "Dinner! Sat. Aug 1, Before Kelly: Hell's Kitchen",
    description:
      "Saturday, Aug. 1st before the concert. Dinner is scheduled for 5:30pm, as the show starts at 8:00pm. You can join for dinner even if you are not interested in the concert.",
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description: "Will be added to reservation.",
      },
      { value: "cant-make-it", label: "Can't Make It" },
    ],
  },
  {
    slug: "kelly-clarkson",
    eyebrow: "Concert ticket",
    title: "Kelly Clarkson! Sat. Aug 1st. $256 per person!",
    description:
      "We have tried to see her before, and she is finally making it up to Dallas by performing on his birthday weekend. Saturday, Aug. 1st at Caesars Colosseum. Tickets for group seating next to Dallas are $256 per person. Deposit needed by June 10th. You are welcome to find better or cheaper tickets if you do not mind sitting elsewhere.",
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description: "You can always buy tickets on your own.",
      },
      { value: "cant-make-it", label: "Can't Make It" },
    ],
  },
  {
    slug: "sadelles-brunch",
    eyebrow: "Brunch",
    title: "Brunch! Sadelle's: Sunday, Aug 2nd",
    description:
      "Located just inside the Bellagio Conservatory. Sadelle's brunch is Sunday, Aug. 2nd at 11:00am. Hopefully we are recovered from the previous night.",
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description: "Will still be added to reservation.",
      },
      { value: "cant-make-it", label: "Can't Make It" },
    ],
  },
  {
    slug: "speed-vegas",
    eyebrow: "Adrenaline",
    title: "Speed Vegas: Sun. Aug 2 Racing + Go-Karts!",
    description:
      "Join for exotic car racing at $299 for 5 laps to start, ride passenger while a professional drifts at $99 for 5 laps, or race each other in go-karts starting at $35. Choice is yours at 1:30pm. Dallas will be contacting the venue for a list of what everyone wants to do.",
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description: "Decide by June 10th.",
      },
      {
        value: "cant-make-it",
        label: "Can't Make It",
        description: "Too butch for me!",
      },
    ],
  },
  {
    slug: "last-supper",
    eyebrow: "Themed dinner",
    title: "The Last Supper! (Themed) Sunday Aug 2",
    description:
      "Welcome to the Redemption Dinner. Do you need to repent, or will another martini suffice? No judgment. Join us. Dinner is themed and encouraged. This is the last theme, promise. Located at Lago inside Bellagio at 7:30pm.",
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description: "Will be added to reservation.",
      },
      { value: "cant-make-it", label: "Can't Make It" },
    ],
  },
  {
    slug: "salt-ivy-brunch",
    eyebrow: "Brunch tradition",
    title: "Brunch Bitch Tradition! Mon. Aug 2, Salt & Ivy",
    description:
      "This is a tradition spot for Dallas and Scott, and they invite you to the last brunch of their trip for those still sinfully straggling. Mon. Aug. 2 at Salt & Ivy, located in Aria at 11:30am.",
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description: "Will be added to reservation.",
      },
      { value: "cant-make-it", label: "Can't Make It" },
    ],
  },
  {
    slug: "gymkhana-dinner",
    eyebrow: "Dinner reservation",
    title: "Dinner! Gymkhana Mon. Aug 3, 7:30pm",
    description:
      "Gymkhana has just opened, brought over from the UK's 2-star Michelin location. Traditional and nontraditional Indian cuisine. Join if you are still somehow around.",
    options: [
      { value: "attending", label: "Attending" },
      {
        value: "might-attend",
        label: "Might Attend",
        description: "Will be added to reservation.",
      },
      { value: "cant-make-it", label: "Can't Make It" },
    ],
  },
];

export const speedVegasInterests: InterestOption[] = [
  {
    slug: "exotic-racing",
    label: "Exotic Racing",
    description: "$299+, depends on car selection and laps.",
  },
  {
    slug: "passenger-drifting",
    label: "Passenger Drifting",
    description: "$99.",
  },
  {
    slug: "go-karts",
    label: "Go-Karts",
    description: "$35+, depends on how many races.",
  },
];
