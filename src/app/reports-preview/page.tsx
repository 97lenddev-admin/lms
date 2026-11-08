import BranchManagerApp from "../branch-manager/branch-manager-app";
import { submissions } from "../credit-analyst/data";
export default function Preview() {
  return (
    <BranchManagerApp
      userProfile={{ fullName: "Jose Rizal", role: "Branch Manager" }}
      initialSubmissions={submissions}
    />
  );
}
