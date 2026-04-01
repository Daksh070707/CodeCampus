import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Coins, Plus, Trophy } from "lucide-react";
import RecruiterLayout from "@/components/layout/RecruiterLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HostedGame {
  id: string;
  title: string;
  type: "Hackathon" | "Bounty" | "Token Challenge";
  reward: string;
  startDate: string;
  participants: number;
}

const initialGames: HostedGame[] = [
  {
    id: "hosted-1",
    title: "Spring Hiring Hackathon",
    type: "Hackathon",
    reward: "Fast-track interview + offer points",
    startDate: "2026-04-15",
    participants: 96,
  },
  {
    id: "hosted-2",
    title: "Backend Bug Bounty Week",
    type: "Bounty",
    reward: "150 bounty tokens",
    startDate: "2026-04-24",
    participants: 52,
  },
];

const RecruiterCodingGames = () => {
  const [hostedGames, setHostedGames] = useState<HostedGame[]>(initialGames);
  const [form, setForm] = useState({
    title: "",
    type: "Hackathon" as HostedGame["type"],
    reward: "",
    startDate: "",
    details: "",
  });

  const canHost = useMemo(
    () => form.title.trim() && form.reward.trim() && form.startDate,
    [form]
  );

  const createGame = () => {
    if (!canHost) return;

    const newGame: HostedGame = {
      id: `hosted-${Date.now()}`,
      title: form.title.trim(),
      type: form.type,
      reward: form.reward.trim(),
      startDate: form.startDate,
      participants: 0,
    };

    setHostedGames((prev) => [newGame, ...prev]);
    setForm({
      title: "",
      type: "Hackathon",
      reward: "",
      startDate: "",
      details: "",
    });
  };

  return (
    <RecruiterLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-semibold">Coding Games</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Host coding events for students including hackathons, bug bounty competitions,
            and token challenges.
          </p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle>Host a New Coding Game</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="game-title">Event title</Label>
                <Input
                  id="game-title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Summer Product Hackathon"
                />
              </div>
              <div className="space-y-2">
                <Label>Game type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: HostedGame["type"]) =>
                    setForm((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hackathon">Hackathon</SelectItem>
                    <SelectItem value="Bounty">Bounty</SelectItem>
                    <SelectItem value="Token Challenge">Token Challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reward">Reward details</Label>
                <Input
                  id="reward"
                  value={form.reward}
                  onChange={(e) => setForm((prev) => ({ ...prev, reward: e.target.value }))}
                  placeholder="e.g., 300 tokens + interview shortlist"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">Start date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Challenge brief</Label>
              <Textarea
                id="details"
                value={form.details}
                onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
                placeholder="Share goals, rules, and judging criteria"
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={createGame} disabled={!canHost} variant="recruiter">
                <Plus className="w-4 h-4 mr-2" />
                Host Game
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {hostedGames.map((game) => (
            <Card key={game.id}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-xl">{game.title}</CardTitle>
                  <Badge variant="secondary">{game.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Starts: {game.startDate}
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Reward: {game.reward}
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  {game.participants} students joined
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterCodingGames;
