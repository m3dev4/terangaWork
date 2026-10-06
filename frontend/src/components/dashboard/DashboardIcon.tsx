import { awardIcon, cashIcon, chatIcon, notifIcon, userIcon, workIcon } from "../../assets/images";

const icons = { award: awardIcon, cash: cashIcon, chat: chatIcon, notification: notifIcon, user: userIcon, work: workIcon };

export default function DashboardIcon({ kind, size = "medium" }: {
  kind: keyof typeof icons;
  size?: "small" | "medium" | "large" | "hero";
}) {
  return (
    <span className={`dashboard-icon dashboard-icon--${size}`} aria-hidden="true">
      <img className="dashboard-icon-image" src={icons[kind]} alt="" draggable={false} />
      <img className="dashboard-icon-reflection" src={icons[kind]} alt="" draggable={false} />
    </span>
  );
}
