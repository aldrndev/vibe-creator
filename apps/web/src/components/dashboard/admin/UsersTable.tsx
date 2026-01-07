import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
} from "@heroui/react";
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
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          startContent={<Search size={16} />}
          className="max-w-xs"
          size="sm"
        />
      </CardHeader>
      <CardBody>
        <Table aria-label="Users table">
          <TableHeader>
            <TableColumn>USER</TableColumn>
            <TableColumn>TIER</TableColumn>
            <TableColumn>EXPORTS</TableColumn>
            <TableColumn>JOINED</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody isLoading={isLoading}>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-foreground/60">{u.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    color={
                      u.subscription?.tier === "PRO"
                        ? "warning"
                        : u.subscription?.tier === "CREATOR"
                        ? "primary"
                        : "default"
                    }
                  >
                    {u.subscription?.tier || "FREE"}
                  </Chip>
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
                      isIconOnly
                      size="sm"
                      variant="flat"
                      onPress={() => onEditUser(u)}
                    >
                      <Edit size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}
