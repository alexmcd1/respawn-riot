// QuestList iframe — fixed at the visible viewport height.
//
// Earlier this component used postMessage to auto-resize the iframe to
// content height. That solved one problem (no iframe scrollbar when
// content fit) but reintroduced another (iframe scrolling when content
// didn't fit), and bled the task list into the outer page scroll.
//
// The right architecture turns out to be the simpler one:
//   - iframe = exactly the visible viewport, always
//   - QuestList itself is now laid out so only its task-list area
//     scrolls internally (see public/games/questlist/index.html —
//     html/body overflow:hidden + flex layout with min-h-0 + the task
//     pane wrapped in overflow-y-auto scroll-thin)
//
// Result: on desktop with a few tasks NO scrollbar appears anywhere.
// On long task lists the scrollbar appears only inside the task list
// section — the header, QuickAdd form, and filter tabs stay sticky.
// No JS needed.

export default function QuestListEmbed() {
  return (
    // No container chrome — the iframe runs edge-to-edge with no
    // border, no rounded corners, no shadow. The inner body goes
    // transparent (via ?embed=1 flipping body.embed inside
    // public/games/questlist/index.html) so the parent's gradient
    // bleeds through. Reads as a native section, not an iframe pasted in.
    <section className="px-0">
      <div className="mx-auto max-w-5xl">
        <iframe
          src="/games/questlist/index.html?embed=1"
          title="QuestList by kid_ghost"
          className="block w-full bg-transparent"
          style={{
            // 100dvh handles iOS Safari's collapsing toolbar correctly.
            // 160px reserves space for the parent page's NavBar +
            // QuestList page hero. minHeight is a floor for small
            // landscape phones.
            height: 'calc(100dvh - 160px)',
            minHeight: '600px',
            border: 0,
            colorScheme: 'dark',
          }}
        />
      </div>
    </section>
  )
}
