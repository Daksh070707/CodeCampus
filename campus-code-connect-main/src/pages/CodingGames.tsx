import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Coins, Code2, Search, Trophy } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const games = [
  {
    id: "game-1",
    title: "National Campus Hackathon",
    organizer: "CodeCampus x TechNova",
    type: "Hackathon",
    reward: "Top 3 receive paid internship interviews",
    startsOn: "April 12, 2026",
    seatsLeft: 132,
  },
  {
    id: "game-2",
    title: "Bug Bounty Sprint",
    organizer: "SecureStack Labs",
    type: "Bounty",
    reward: "250 bounty tokens + swag kits",
    startsOn: "April 20, 2026",
    seatsLeft: 78,
  },
  {
    id: "game-3",
    title: "Token Code Quest",
    organizer: "ChainHire",
    type: "Token Challenge",
    reward: "500 tokens + mentorship circle",
    startsOn: "April 28, 2026",
    seatsLeft: 214,
  },
];

const CodingGames = () => {
  const [query, setQuery] = useState("");

  const filteredGames = useMemo(() => {
    if (!query.trim()) return games;
    const q = query.toLowerCase();
    return games.filter((game) =>
      [game.title, game.organizer, game.type, game.reward].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [query]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-3"
        >
          <h1 className="text-3xl font-semibold">Coding Games</h1>
          <p className="text-muted-foreground max-w-2xl">
            Join recruiter-hosted hackathons, bounty tasks, and token-based coding games.
            Students can participate and compete, while hosting is managed from the recruiter side.
          </p>
        </motion.div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-xl">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hackathons, bounties, or token games"
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {filteredGames.map((game) => (
            <Card key={game.id}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{game.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Hosted by {game.organizer}</p>
                  </div>
                  <Badge variant="secondary">{game.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Starts on {game.startsOn}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Reward: {game.reward}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  {game.seatsLeft} participation slots left
                </div>
                <Button className="w-full">
                  <Trophy className="w-4 h-4 mr-2" />
                  Participate Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredGames.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No coding games matched your search.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default CodingGames;
