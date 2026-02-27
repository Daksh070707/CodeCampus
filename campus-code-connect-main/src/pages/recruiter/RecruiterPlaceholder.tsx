import RecruiterLayout from "@/components/layout/RecruiterLayout";

const RecruiterPlaceholder = ({ title, description }: { title: string; description: string }) => {
  return (
    <RecruiterLayout>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterPlaceholder;
