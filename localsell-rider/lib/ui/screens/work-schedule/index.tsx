import WorkspacePage from "@/lib/ui/layouts/workspace-page";

import WorkScheduleMainScreen from "@/lib/ui/screen-components/work-schedule/main";

export default function WorkScheduleScreen() {
  return (
    <WorkspacePage
      title="Work schedule"
      description="Set your working days and delivery availability."
      compact
    >
      <WorkScheduleMainScreen />
    </WorkspacePage>
  );
}
