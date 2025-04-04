import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UserService } from './user.service';

@Injectable()
export class WalletCronService {
  private readonly BATCH_SIZE = 50; // Process 50 users at a time

  constructor(private readonly userService: UserService) { }

  @Cron('*/5 * * * * *') // Run every 5 seconds
  async createWalletsForUsers() {
    try {
      // Get users without wallets
      const usersWithoutWallets = await this.userService.findUsersWithoutWallets(this.BATCH_SIZE);

      if (usersWithoutWallets.length === 0) {
        console.log('No users found without wallets');
        return;
      }

      console.log(`Found ${usersWithoutWallets.length} users without wallets`);

      // Process users in parallel with a limit
      const batchPromises = usersWithoutWallets.map(user =>
        this.userService.createWalletForUser(user)
          .catch(error => {
            console.error(`Error creating wallet for user ${user.id}:`, error);
            return null;
          })
      );

      await Promise.all(batchPromises);

      console.log('Wallet creation cronjob completed');
    } catch (error) {
      console.error('Error in wallet creation cronjob:', error);
    }
  }
} 