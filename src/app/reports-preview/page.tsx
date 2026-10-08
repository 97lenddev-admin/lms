import BranchManagerApp from "../branch-manager/branch-manager-app";
export default function Preview() {
  return (
    <BranchManagerApp
      userProfile={{ fullName: "Jose Rizal", role: "Branch Manager" }}
    />
  );
}
