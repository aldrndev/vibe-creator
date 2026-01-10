import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Badge,
  Button,
} from "@/components/ui";
import { Search, Edit } from "lucide-react";
import { UserData } from "@/hooks/useAdminData";

interface UsersTableProps {
  users: UserData[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onEditUser: (user: UserData) => void;
}

export function UsersTable({
  users,
  isLoading,
  searchQuery,
  setSearchQuery,
  onEditUser,
}: UsersTableProps) {
  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row justify-between items-center">
        <h2 className="text-lg font-semibold">Users</h2>
        <div className="relative max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardBody>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>USER</TableHead>
              <TableHead>TIER</TableHead>
              <TableHead>EXPORTS</TableHead>
              <TableHead>JOINED</TableHead>
              <TableHead>ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        u.subscription?.tier === "PRO"
                          ? "warning"
                          : u.subscription?.tier === "CREATOR"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {u.subscription?.tier || "FREE"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.subscription?.exportsUsed || 0} /{" "}
                    {u.subscription?.exportsLimit || 5}
                  </TableCell>
                  <TableCell>
                    {new Date(u.createdAt).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => onEditUser(u)}
                      >
                        <Edit size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}
